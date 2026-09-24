from flask import jsonify, request, current_app, g
import logging
import os
from bson import json_util, ObjectId
from bson.errors import InvalidId
from botocore.exceptions import BotoCoreError, ClientError
import json
from pymongo.errors import PyMongoError
from werkzeug.utils import secure_filename
from datetime import datetime

# list, insert mongodb functions
from data import (
    list_mrdfiles_for_user, insert_mrdfile_header, read_mrdfile_header,
    get_mrdfile_by_id_with_auth, change_file_visibility, get_db, get_s3_client
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

# Route to upload MRD files
@mrds_bp.route("/upload", methods=["POST"])
@requires_auth
def upload_file():
    """
    Handle batch upload of MRD files with proper error handling and status tracking
    """
    if "file" not in request.files:
        raise BadRequest("No files selected")

    # Get the current user name from form data (sent from frontend)
    if "ownerName" not in request.form:
        raise BadRequest("current UserName not found")
    current_user_name = request.form.get("ownerName")

    # Get group name from form data (null for private files)
    group_name = request.form.get("groupName")
    if group_name == "null" or group_name == "":
        group_name = None

    s3 = get_s3_client()
    bucket = current_app.config['S3_BUCKET']

    # Create temporary directory for file processing
    upload_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "tmpdata")
    os.makedirs(upload_path, exist_ok=True)

    files = request.files.getlist("file")
    results = []
    successful_files = 0
    failed_files = 0

    # Process each file
    for file in files:
        if file.filename == '':
            continue

        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            results.append({
                "original_filename": file.filename,
                "status": "error",
                "error": f"File type {file_ext} not allowed. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            })
            failed_files += 1
            continue

        # Save file to temporary location
        temp_filepath = os.path.join(upload_path, secure_filename(file.filename))
        file.save(temp_filepath)

        # The time.sleep() calls that used to sit between these steps --
        # 0.9 to 1.6 seconds per file -- only faked a progress feel. Removed.
        try:
            db_entry = read_mrdfile_header(temp_filepath, owner_name=current_user_name)

            # Set ownership and group information
            db_entry["ownerId"] = g.user_sub
            db_entry["groupName"] = group_name

            inserted_id = insert_mrdfile_header(db_entry)

            # Upload to S3 with the MongoDB ObjectId as the key
            s3_key = f"mrd_files/{str(inserted_id)}"
            s3.upload_file(temp_filepath, bucket, s3_key)

            get_db().mrdfiles.update_one(
                {"_id": inserted_id},
                {"$set": {"s3_key": s3_key}}
            )

            # Convert metadata to JSON-serializable format
            serializable_metadata = {key: str(value) for key, value in db_entry.items()}

            results.append({
                "original_filename": file.filename,
                "status": "completed",
                "metadata": serializable_metadata,
                "db_id": str(inserted_id),
                "s3_key": s3_key
            })
            successful_files += 1

        except Exception:  # pylint: disable=broad-exception-caught
            # Broad on purpose: one bad file must not abort the batch, because
            # the client relies on per-file outcomes (and the 207). The detail
            # goes to the log; the client gets a stable message rather than raw
            # pymongo or botocore text, which is what str(e) used to send.
            logger.exception("upload failed for %s", file.filename)
            results.append({
                "original_filename": file.filename,
                "status": "error",
                "error": "Could not store the file. Please try again."
            })
            failed_files += 1

        finally:
            # Always cleanup temporary file
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)

    # Prepare response
    response_data = {
        "message": f"Processed {len(results)} files",
        "total_files": len(results),
        "successful_files": successful_files,
        "failed_files": failed_files,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Return appropriate status code based on results
    if failed_files > 0 and successful_files > 0:
        return jsonify(response_data), 207  # 207 Multi-Status for partial success
    elif failed_files > 0:
        return jsonify(response_data), 400  # 400 Bad Request if all files failed
    else:
        return jsonify(response_data), 200  # 200 OK if all files succeeded

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
