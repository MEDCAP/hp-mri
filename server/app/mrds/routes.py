from flask import jsonify, request, current_app, g
import io
import logging
import os
from bson import json_util, ObjectId
from bson.errors import InvalidId
from botocore.exceptions import BotoCoreError, ClientError
import json
from pymongo.errors import PyMongoError

# list, insert mongodb functions
from data import (
    list_mrdfiles_for_user, insert_mrdfile_header, read_mrdfile_header,
    get_mrdfile_by_id_with_auth, change_file_visibility, is_group_member,
    get_db, get_s3_client
)
from app.auth import optional_auth, requires_auth
from app.errors import ApiError, BadRequest, NotFound

# flask blueprint for mrds route
from . import mrds_bp

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'.bin', '.mrd', '.mrd2'}


def _pagination():
    """
    Read limit/skip from the query string.

    A malformed value used to reach int() inside a blanket except and come back
    as a 400 by accident; it is now a 400 on purpose, with a message that says
    which parameter was wrong.
    """
    try:
        limit = min(int(request.args.get("limit", 50)), 200)
        skip = int(request.args.get("skip", 0))
    except ValueError:
        raise BadRequest("limit and skip must be integers") from None
    if limit < 0 or skip < 0:
        raise BadRequest("limit and skip must not be negative")
    return limit, skip


# Fields a guest may see. Owner ids and S3 keys are for signed-in users only.
GUEST_PROJECTION = {
    "fileName": 1,
    "studyDate": 1,
    "studyTime": 1,
    "ownerName": 1,
    "subjectType": 1,
    "groupName": 1,
    "isReconstructed": 1,
    "protocolName": 1,
    "upload_timestamp": 1,
    "file_size": 1,
    "_id": 1
}

USER_PROJECTION = {
    **GUEST_PROJECTION,
    "ownerId": 1,
    "measurementId": 1,
    "stationName": 1,
    "original_filename": 1,
    "s3_key": 1,
}

# Route to list MRD files
@mrds_bp.route("/mrd-files", methods=["GET"])
@optional_auth
def show_files():
    """
    Return the MRD files the caller may see: the public group for guests; their
    own, their groups' and public files for signed-in users.
    """
    limit, skip = _pagination()
    proj = USER_PROJECTION if g.user_sub else GUEST_PROJECTION
    return jsonify(list_mrdfiles_for_user(g.user_sub, projection=proj, limit=limit, skip=skip))

# Route to retrieve specific file details
@mrds_bp.route("/mrd-files/<file_id>", methods=["GET"])
@requires_auth
def get_file_details(file_id):
    # A malformed id and a file the user cannot see are both "not found";
    # a database failure is a 503 from the error handler.
    file_data = get_mrdfile_by_id_with_auth(file_id, g.user_sub)
    if not file_data:
        raise NotFound("File not found or access denied")
    # json_util handles BSON types like ObjectId
    return json.loads(json_util.dumps(file_data)), 200

# --- Presigned direct-to-S3 upload ---------------------------------------------
#
# The browser PUTs file bytes straight to S3, so the API never sits on the data
# path and is not bound by the gunicorn request timeout. Three steps:
#
#   1. init     mint an upload id + presigned PUT URL into the caller's staging prefix
#   2. (client) PUT the bytes to S3
#   3. complete parse the staged object, promote it to mrd_files/{id}, write Mongo
#
# Nothing is written to MongoDB until step 3 succeeds, so an abandoned upload
# leaves no database state. Abandoned staging objects are reaped by the bucket
# lifecycle rule on UPLOAD_STAGING_PREFIX.

def _validated_upload_fields(require_size=False):
    """
    Validate the JSON body shared by the upload endpoints.

    init and complete both declare a filename and a groupName (null for
    private); only init also declares a size. The owner comes from the token,
    never the body.

    @param require_size: also validate and return fileSize (init only)
    @return: (filename, group_name or None, file_size or None)
    @raise BadRequest: on any invalid or missing field
    @raise ApiError(403): if the caller is not a member of groupName
    """
    body = request.get_json(silent=True) or {}
    filename = body.get("filename")
    group_name = body.get("groupName") or None

    if not filename:
        raise BadRequest("filename is required")
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        supported = ', '.join(sorted(ALLOWED_EXTENSIONS))
        raise BadRequest(f"File type {file_ext} not allowed. Supported: {supported}")
    if group_name is not None and not is_group_member(group_name, g.user_sub):
        raise ApiError("You are not a member of that group", code="forbidden", status=403)

    if not require_size:
        return filename, group_name, None

    file_size = body.get("fileSize")
    max_bytes = current_app.config['MAX_UPLOAD_BYTES']
    # bool is a subclass of int, so it is excluded explicitly.
    if isinstance(file_size, bool) or not isinstance(file_size, int) or file_size <= 0:
        raise BadRequest("fileSize must be a positive integer")
    if file_size > max_bytes:
        raise BadRequest(f"File exceeds the maximum upload size of {max_bytes} bytes")
    return filename, group_name, file_size


def _staging_key(upload_id):
    """
    S3 key an in-flight presigned upload is written to. Scoped to the caller, so
    complete and abort can only ever touch the caller's own staged objects.
    """
    return f"{current_app.config['UPLOAD_STAGING_PREFIX']}{g.user_sub}/{upload_id}"


def _parse_upload_id(upload_id):
    """
    Validate that upload_id is a well-formed ObjectId before it is used to build
    an S3 key. Returns the ObjectId or None.
    """
    try:
        return ObjectId(upload_id)
    except (InvalidId, TypeError):
        return None


@mrds_bp.route("/uploads/init", methods=["POST"])
@requires_auth
def init_upload():
    """
    Mint a presigned PUT URL for a single MRD file. No database write happens here.
    """
    _validated_upload_fields(require_size=True)

    # The upload id doubles as the eventual Mongo _id and S3 key suffix.
    upload_id = ObjectId()
    expires_in = current_app.config['PRESIGN_EXPIRY_SECONDS']

    upload_url = get_s3_client().generate_presigned_url(
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
@requires_auth
def complete_upload(upload_id):
    """
    Finalize an upload: verify the staged object, parse its MRD header, promote it
    to mrd_files/{upload_id}, and insert the metadata document.
    """
    object_id = _parse_upload_id(upload_id)
    if object_id is None:
        raise BadRequest("Invalid upload id")

    filename, group_name, _file_size = _validated_upload_fields()

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
        owner_name=g.user_name,
        original_filename=filename,
        file_size=actual_size,
    )
    metadata["ownerId"] = g.user_sub
    metadata["groupName"] = group_name

    # Server-side copy: the bytes never travel through this process.
    s3_key = f"mrd_files/{str(object_id)}"
    s3.copy_object(
        Bucket=bucket,
        Key=s3_key,
        CopySource={"Bucket": bucket, "Key": staging_key},
    )

    inserted_id = insert_mrdfile_header({**metadata, "s3_key": s3_key}, doc_id=object_id)

    # Best effort -- a leftover staging object is harmless and the lifecycle rule
    # will expire it.
    try:
        s3.delete_object(Bucket=bucket, Key=staging_key)
    except (ClientError, BotoCoreError):
        logger.warning("failed to clean up staging object %s", staging_key, exc_info=True)

    # Mongo values (datetime, ObjectId) are not JSON-serializable as-is.
    serializable_metadata = {k: str(v) for k, v in metadata.items()}

    return jsonify({
        "fileId": str(inserted_id),
        "s3_key": s3_key,
        "metadata": serializable_metadata,
    }), 201


@mrds_bp.route("/uploads/<upload_id>/abort", methods=["POST"])
@requires_auth
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
        except (ClientError, BotoCoreError):
            # Best effort: the staging lifecycle rule reaps whatever is missed.
            logger.warning("failed to abort upload %s", upload_id, exc_info=True)
    return "", 204

@mrds_bp.route("/mrd-file", methods=["DELETE"])
@requires_auth
def delete_files():
    """
    Batch delete files from S3 and MongoDB, itemising the outcome per file.

    KNOWN ISSUE, deliberately unchanged here: deletion is authorised with
    get_mrdfile_by_id_with_auth, which is the READ check. It admits the owner,
    any member of the file's group, and -- for legacy files with neither an
    ownerId nor a groupName -- any signed-in user. So group members can delete
    each other's files, and anyone can delete pre-groups files. Compare
    change_file_visibility, which requires ownership. Restricting this is a
    policy decision about who may delete group files; see docs/KNOWN-ISSUES.md.
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
        file_doc = get_mrdfile_by_id_with_auth(file_id, g.user_sub)

        if not file_doc:
            file_results.append({
                "file_id": file_id,
                "file_name": "Unknown",
                "status": "error",
                "db_deleted": False,
                "s3_deleted": False,
                "error": "File not found in database"
            })
            continue

        file_result = {
            "file_id": file_id,
            "file_name": file_doc.get('fileName', 'Unknown'),
            "status": "success",
            "db_deleted": False,
            "s3_deleted": False,
            "error": None
        }

        # Delete from S3 if s3_key exists
        if 's3_key' in file_doc:
            try:
                s3.delete_object(Bucket=bucket, Key=file_doc['s3_key'])
                s3_deleted_count += 1
                file_result["s3_deleted"] = True
            except (ClientError, BotoCoreError):
                logger.exception("S3 delete failed for %s", file_id)
                file_result["status"] = "error"
                file_result["error"] = "Could not delete the file from storage"

        # Delete from MongoDB
        try:
            result = db.mrdfiles.delete_one({"_id": ObjectId(file_id)})
            if result.deleted_count > 0:
                deleted_count += 1
                file_result["db_deleted"] = True
        except (PyMongoError, InvalidId):
            logger.exception("database delete failed for %s", file_id)
            file_result["status"] = "error"
            file_result["error"] = "Could not delete the file record"

        file_results.append(file_result)

    return jsonify({
        "message": f"Successfully deleted {deleted_count} files from database and {s3_deleted_count} files from S3",
        "deleted_count": deleted_count,
        "s3_deleted_count": s3_deleted_count,
        "file_results": file_results
    }), 200

@mrds_bp.route("/mrd-file/<file_id>/download", methods=["GET"])
@requires_auth
def download_file(file_id):  # pylint: disable=unused-argument
    """
    Not implemented. Previously the body was `pass`, which makes Flask raise
    because a view returned None, and the <int:> converter could never match a
    real ObjectId. Takes a string now and says 501.
    """
    raise ApiError("File download is not implemented yet.", code="not_implemented", status=501)

@mrds_bp.route("/mrd-files/<file_id>/share", methods=["POST"])
@requires_auth
def share_file(file_id):
    """
    Change file visibility from private to group or vice versa
    """
    data = request.get_json(silent=True)
    if not data:
        raise BadRequest("No data provided")

    new_group_name = data.get("groupName")
    if new_group_name == "null" or new_group_name == "":
        new_group_name = None

    if not change_file_visibility(file_id, new_group_name, g.user_sub):
        raise BadRequest("Failed to update file visibility or access denied")
    return jsonify({"message": "File visibility updated successfully"}), 200
