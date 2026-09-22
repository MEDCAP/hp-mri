from flask import jsonify, request, current_app
import io
import os
import tempfile
from botocore.exceptions import ClientError
from pymongo.errors import PyMongoError
from bson import json_util, ObjectId
from bson.errors import InvalidId
import json

# list, insert mongodb functions
from data import list_all_mrdfiles, insert_mrdfile_header, read_mrdfile_header
# read mrd header function
from data import get_mrdfile_by_id, get_db
# process-wide S3 client
from data import get_s3_client

from app.auth import require_auth
from app.errors import ApiError, BadRequest, NotFound
from app.jobs.service import start_job
from app.tyger.runner import run_chain
from app.tyger.stages import get_converter

# flask blueprint for mrds route
from . import mrds_bp

# What each kind of upload is allowed to carry. A "mrd" upload is a file the
# viewer can read as it stands; a "raw-tar" one is a scan folder that has to go
# through a converter before anything can open it.
UPLOAD_KINDS = {
    "mrd": {'.bin', '.mrd', '.mrd2'},
    "raw-tar": {'.tar'},
}


def _validated_upload_fields(require_size=False, kind=None):
    """
    Validate the JSON body shared by the upload endpoints.

    init, complete and convert all declare a filename and an ownerName; only
    init also declares a size. Previously each endpoint spelled these checks out
    itself, which is how they drifted into returning differently-worded errors
    for the same bad input.

    @param require_size: also validate and return fileSize (init only)
    @param kind: the upload kind whose extensions apply. None reads it from the
                 body, which is how init learns what the client is about to
                 stage; an endpoint that only handles one kind names it.
    @return: (filename, owner_name, file_size or None)
    @raise BadRequest: on any invalid or missing field
    """
    body = request.get_json(silent=True) or {}
    filename = body.get("filename")
    owner_name = body.get("ownerName")

    if kind is None:
        kind = body.get("kind") or "mrd"
    allowed = UPLOAD_KINDS.get(kind)
    if allowed is None:
        raise BadRequest(
            f"Upload kind {kind} not allowed. "
            f"Supported: {', '.join(sorted(UPLOAD_KINDS))}"
        )

    if not filename:
        raise BadRequest("filename is required")
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in allowed:
        supported = ', '.join(sorted(allowed))
        raise BadRequest(f"File type {file_ext} not allowed. Supported: {supported}")
    if not owner_name:
        raise BadRequest("ownerName is required")

    if not require_size:
        return filename, owner_name, None

    file_size = body.get("fileSize")
    max_bytes = current_app.config['MAX_UPLOAD_BYTES']
    # bool is a subclass of int, so it is excluded explicitly.
    if isinstance(file_size, bool) or not isinstance(file_size, int) or file_size <= 0:
        raise BadRequest("fileSize must be a positive integer")
    if file_size > max_bytes:
        raise BadRequest(f"File exceeds the maximum upload size of {max_bytes} bytes")
    return filename, owner_name, file_size


def _staging_key(upload_id):
    """S3 key an in-flight presigned upload is written to."""
    return f"{current_app.config['UPLOAD_STAGING_PREFIX']}{upload_id}"


def _discard_staged(s3, bucket, staging_key):
    """Drop a staged object once it has been promoted. Best effort: a leftover is
    harmless and the staging prefix lifecycle rule expires it."""
    try:
        s3.delete_object(Bucket=bucket, Key=staging_key)
    except ClientError:
        current_app.logger.warning(
            "failed to clean up staging object %s", staging_key, exc_info=True
        )


def _parse_upload_id(upload_id):
    """
    Validate that upload_id is a well-formed ObjectId before it is used to build
    an S3 key. Returns the ObjectId or None.
    """
    try:
        return ObjectId(upload_id)
    except (InvalidId, TypeError):
        return None

# Route to list MRD files
@mrds_bp.route("/mrd-files", methods=["GET"])
@require_auth
def show_files():
    """
    Return a list of MRD files with selected fields from MongoDB
    """
    # define projection to list only relevant fields for display
    proj = {
        "fileName": 1,
        "studyDate": 1,
        "studyTime": 1,
        "ownerName": 1,
        "subjectType": 1,
        "groupName": 1,
        "isReconstructed": 1,
        "protocolName": 1,
        "measurementId": 1,
        "stationName": 1,
        "original_filename": 1,
        "upload_timestamp": 1,
        "file_size": 1,
        "s3_key": 1,
        "_id": 1
    }
    # list of cursor object
    return jsonify(list_all_mrdfiles(projection=proj))

# Route to retrieve specific file details
@mrds_bp.route("/mrd-files/<file_id>", methods=["GET"])
@require_auth
def get_file_details(file_id):
    # An unparseable id raises InvalidId, which the shared handler turns into a
    # 400; a well-formed id that matches nothing is a 404.
    file_data = get_mrdfile_by_id(file_id)
    if not file_data:
        raise NotFound("File not found")
    # json_util handles BSON types like ObjectId
    return json.loads(json_util.dumps(file_data)), 200

# --- Presigned direct-to-S3 upload ---------------------------------------------
#
# The browser PUTs file bytes straight to S3, so the API never sits on the data
# path and is not bound by the gunicorn request timeout. Three steps:
#
#   1. init     mint an upload id + presigned PUT URL into the staging prefix
#   2. (client) PUT the bytes to S3
#   3. complete parse the staged object, promote it to mrd_files/{id}, write Mongo
#
# Nothing is written to MongoDB until step 3 succeeds, so an abandoned upload
# leaves no database state. Abandoned staging objects are reaped by the bucket
# lifecycle rule on UPLOAD_STAGING_PREFIX.

@mrds_bp.route("/uploads/init", methods=["POST"])
@require_auth
def init_upload():
    """
    Mint a presigned PUT URL for a single MRD file. No database write happens here.
    """
    _filename, _owner_name, _file_size = _validated_upload_fields(require_size=True)

    # The upload id doubles as the eventual Mongo _id and S3 key suffix.
    upload_id = ObjectId()
    expires_in = current_app.config['PRESIGN_EXPIRY_SECONDS']

    s3 = get_s3_client()
    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": current_app.config['S3_BUCKET'],
            "Key": _staging_key(upload_id),
            # Must match the Content-Type the browser sends, or S3 rejects
            # the signature.
            "ContentType": "application/octet-stream",
        },
        ExpiresIn=expires_in,
    )

    return jsonify({
        "uploadId": str(upload_id),
        "uploadUrl": upload_url,
        "expiresIn": expires_in,
    }), 200


@mrds_bp.route("/uploads/<upload_id>/complete", methods=["POST"])
@require_auth
def complete_upload(upload_id):
    """
    Finalize an upload: verify the staged object, parse its MRD header, promote it
    to mrd_files/{upload_id}, and insert the metadata document.
    """
    object_id = _parse_upload_id(upload_id)
    if object_id is None:
        raise BadRequest("Invalid upload id")

    filename, owner_name, _file_size = _validated_upload_fields(kind="mrd")

    s3 = get_s3_client()
    bucket = current_app.config['S3_BUCKET']
    staging_key = _staging_key(object_id)

    try:
        head = s3.head_object(Bucket=bucket, Key=staging_key)
    except ClientError as exc:
        # A genuinely unreachable S3 is a 503 from the shared handler; only a
        # missing staged object is the client's problem.
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code not in ("404", "NoSuchKey", "NotFound"):
            raise
        raise NotFound(
            "Uploaded object not found. The upload may have failed or expired."
        ) from None

    # A presigned PUT cannot cap its own size, so this is where the limit is
    # actually enforced.
    actual_size = head['ContentLength']
    max_bytes = current_app.config['MAX_UPLOAD_BYTES']
    if actual_size > max_bytes:
        s3.delete_object(Bucket=bucket, Key=staging_key)
        raise BadRequest(f"File exceeds the maximum upload size of {max_bytes} bytes")

    obj = s3.get_object(Bucket=bucket, Key=staging_key)
    metadata = read_mrdfile_header(
        io.BytesIO(obj['Body'].read()),
        owner_name=owner_name,
        original_filename=filename,
        file_size=actual_size,
    )

    # Server-side copy: the bytes never travel through this process.
    s3_key = f"mrd_files/{str(object_id)}"
    s3.copy_object(
        Bucket=bucket,
        Key=s3_key,
        CopySource={"Bucket": bucket, "Key": staging_key},
    )

    inserted_id = insert_mrdfile_header({**metadata, "s3_key": s3_key}, doc_id=object_id)

    _discard_staged(s3, bucket, staging_key)

    # Mongo values (datetime, ObjectId) are not JSON-serializable as-is.
    serializable_metadata = {k: str(v) for k, v in metadata.items()}

    return jsonify({
        "fileId": str(inserted_id),
        "s3_key": s3_key,
        "metadata": serializable_metadata,
    }), 201


@mrds_bp.route("/uploads/<upload_id>/convert", methods=["POST"])
@require_auth
def convert_upload(upload_id):
    """
    Convert a staged raw tar into an MRD file, as a background job.

    Same sequence as complete, with a converter between the download and the
    header parse — and so a job rather than a response, because the converter
    runs for minutes and gunicorn kills a request at 60 seconds.
    """
    object_id = _parse_upload_id(upload_id)
    if object_id is None:
        raise BadRequest("Invalid upload id")

    filename, owner_name, _file_size = _validated_upload_fields(kind="raw-tar")

    converter = (request.get_json(silent=True) or {}).get("converter")
    if not converter:
        raise BadRequest("converter is required")
    get_converter(converter)

    # Read here rather than in the thread: the closure below runs on its own app
    # context, and these are the request's answers to the same questions.
    bucket = current_app.config['S3_BUCKET']
    staging_key = _staging_key(object_id)
    s3_key = f"mrd_files/{str(object_id)}"
    stages = [{"id": converter}]

    def work(handle):
        with tempfile.TemporaryFile() as staged:
            handle.s3.download_fileobj(bucket, staging_key, staged)
            staged.seek(0)
            with run_chain(stages, staged, stage_context=handle.stage) as converted:
                size = converted.seek(0, os.SEEK_END)
                converted.seek(0)
                metadata = read_mrdfile_header(
                    converted,
                    owner_name=owner_name,
                    original_filename=filename,
                    file_size=size,
                )

                # Uploaded before the document is written, so a listed file
                # always has an object behind it.
                converted.seek(0)
                handle.s3.upload_fileobj(converted, bucket, s3_key)

        insert_mrdfile_header({**metadata, "s3_key": s3_key}, doc_id=object_id)
        _discard_staged(handle.s3, bucket, staging_key)
        return str(object_id)

    job_id = start_job(
        "convert",
        {
            "stages": stages,
            "stagingUploadId": str(object_id),
            "ownerName": owner_name,
        },
        work,
    )
    return jsonify({"jobId": job_id}), 202


@mrds_bp.route("/uploads/<upload_id>/abort", methods=["POST"])
@require_auth
def abort_upload(upload_id):
    """
    Discard a staged upload after a client-side cancel or failure. Always succeeds;
    anything missed here is reaped by the staging prefix lifecycle rule.
    """
    object_id = _parse_upload_id(upload_id)
    if object_id is not None:
        try:
            get_s3_client().delete_object(
                Bucket=current_app.config['S3_BUCKET'],
                Key=_staging_key(object_id),
            )
        except ClientError:
            # Best effort: the staging lifecycle rule reaps whatever is missed.
            current_app.logger.warning("failed to abort upload %s", upload_id, exc_info=True)
    return "", 204

@mrds_bp.route("/mrd-file", methods=["DELETE"])
@require_auth
def delete_files():
    """
    Batch delete files from S3 and MongoDB.

    Per-file failures are collected rather than raised: a partial delete is a
    real outcome the client needs itemised, not a single error. Only the
    surrounding request-level failures reach the shared error handler.
    """
    file_ids = (request.get_json(silent=True) or {}).get("ids", [])
    if not file_ids:
        raise BadRequest("No file IDs provided")

    s3 = get_s3_client()
    bucket = current_app.config['S3_BUCKET']
    db = get_db()

    deleted_count = 0
    s3_deleted_count = 0
    file_results = []

    for file_id in file_ids:
        result = {
            "file_id": file_id,
            "file_name": "Unknown",
            "status": "success",
            "db_deleted": False,
            "s3_deleted": False,
            "error": None,
        }

        try:
            object_id = ObjectId(file_id)
        except (InvalidId, TypeError):
            result.update(status="error", error="Invalid file ID")
            file_results.append(result)
            continue

        file_doc = db.mrdfiles.find_one({"_id": object_id})
        if not file_doc:
            result.update(status="error", error="File not found in database")
            file_results.append(result)
            continue

        result["file_name"] = file_doc.get('fileName', 'Unknown')

        if 's3_key' in file_doc:
            try:
                s3.delete_object(Bucket=bucket, Key=file_doc['s3_key'])
                s3_deleted_count += 1
                result["s3_deleted"] = True
            except ClientError:
                # Logged in full server-side; the client gets a stable message
                # rather than the raw botocore text.
                current_app.logger.exception("S3 delete failed for %s", file_id)
                result.update(status="error", error="Could not delete the file from storage")

        try:
            if db.mrdfiles.delete_one({"_id": object_id}).deleted_count > 0:
                deleted_count += 1
                result["db_deleted"] = True
        except PyMongoError:
            current_app.logger.exception("Mongo delete failed for %s", file_id)
            result.update(status="error", error="Could not delete the file record")

        file_results.append(result)

    return jsonify({
        "message": f"Successfully deleted {deleted_count} files from database and {s3_deleted_count} files from S3",
        "deleted_count": deleted_count,
        "s3_deleted_count": s3_deleted_count,
        "file_results": file_results
    }), 200


@mrds_bp.route("/mrd-file/<file_id>/download", methods=["GET"])
@require_auth
def download_file(file_id):
    """
    Not implemented. The path takes an ObjectId string like every other file
    route; it previously declared an <int:> converter, which would have rejected
    every real id even once a body existed.
    """
    raise ApiError(
        "File download is not implemented yet.",
        code="not_implemented",
        status=501,
    )
