from flask import jsonify, request, current_app
import io
import os
import boto3
from bson import json_util, ObjectId
from bson.errors import InvalidId
import json

# list, insert mongodb functions
from data import list_all_mrdfiles, insert_mrdfile_header, read_mrdfile_header
# read mrd header function
from data import get_mrdfile_by_id

# flask blueprint for mrds route
from . import mrds_bp

ALLOWED_EXTENSIONS = {'.bin', '.mrd', '.mrd2'}


def _extension_error(filename):
    """
    Return an error string if the filename's extension is not an accepted MRD
    extension, otherwise None.
    """
    if not filename:
        return "filename is required"
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        supported = ', '.join(sorted(ALLOWED_EXTENSIONS))
        return f"File type {file_ext} not allowed. Supported: {supported}"
    return None


def _staging_key(upload_id):
    """S3 key an in-flight presigned upload is written to."""
    return f"{current_app.config['UPLOAD_STAGING_PREFIX']}{upload_id}"


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
def show_files():
    """
    Return a list of MRD files with selected fields from MongoDB
    """
    try:
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
        cursor_list = list_all_mrdfiles(projection=proj)
        return jsonify(cursor_list)
    except Exception as e:
        return jsonify({"error": "Invalid query of mrdfiles database", "details": str(e)}), 400

# Route to retrieve specific file details
@mrds_bp.route("/mrd-files/<file_id>", methods=["GET"])
def get_file_details(file_id):
    try:
        file_data = get_mrdfile_by_id(file_id)
        if file_data:
            # json_util handles BSON types like ObjectId
            return json.loads(json_util.dumps(file_data)), 200
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": "Invalid file ID", "details": str(e)}), 400

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
def init_upload():
    """
    Mint a presigned PUT URL for a single MRD file. No database write happens here.
    """
    body = request.get_json(silent=True) or {}
    filename = body.get("filename")
    owner_name = body.get("ownerName")
    file_size = body.get("fileSize")

    ext_error = _extension_error(filename)
    if ext_error:
        return jsonify({"error": ext_error}), 400
    if not owner_name:
        return jsonify({"error": "ownerName is required"}), 400

    max_bytes = current_app.config['MAX_UPLOAD_BYTES']
    if not isinstance(file_size, int) or file_size <= 0:
        return jsonify({"error": "fileSize must be a positive integer"}), 400
    if file_size > max_bytes:
        return jsonify({
            "error": f"File exceeds the maximum upload size of {max_bytes} bytes"
        }), 400

    # The upload id doubles as the eventual Mongo _id and S3 key suffix.
    upload_id = ObjectId()
    expires_in = current_app.config['PRESIGN_EXPIRY_SECONDS']

    try:
        s3 = boto3.client("s3")
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
    except Exception as e:
        return jsonify({"error": "Failed to create upload URL", "details": str(e)}), 500

    return jsonify({
        "uploadId": str(upload_id),
        "uploadUrl": upload_url,
        "expiresIn": expires_in,
    }), 200


@mrds_bp.route("/uploads/<upload_id>/complete", methods=["POST"])
def complete_upload(upload_id):
    """
    Finalize an upload: verify the staged object, parse its MRD header, promote it
    to mrd_files/{upload_id}, and insert the metadata document.
    """
    object_id = _parse_upload_id(upload_id)
    if object_id is None:
        return jsonify({"error": "Invalid upload id"}), 400

    body = request.get_json(silent=True) or {}
    filename = body.get("filename")
    owner_name = body.get("ownerName")

    ext_error = _extension_error(filename)
    if ext_error:
        return jsonify({"error": ext_error}), 400
    if not owner_name:
        return jsonify({"error": "ownerName is required"}), 400

    s3 = boto3.client("s3")
    bucket = current_app.config['S3_BUCKET']
    staging_key = _staging_key(object_id)

    try:
        head = s3.head_object(Bucket=bucket, Key=staging_key)
    except Exception:
        return jsonify({
            "error": "Uploaded object not found. The upload may have failed or expired."
        }), 404

    # A presigned PUT cannot cap its own size, so this is where the limit is
    # actually enforced.
    actual_size = head['ContentLength']
    max_bytes = current_app.config['MAX_UPLOAD_BYTES']
    if actual_size > max_bytes:
        s3.delete_object(Bucket=bucket, Key=staging_key)
        return jsonify({
            "error": f"File exceeds the maximum upload size of {max_bytes} bytes"
        }), 400

    try:
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
    except Exception as e:
        return jsonify({"error": "Failed to finalize upload", "details": str(e)}), 500

    # Best effort — a leftover staging object is harmless and the lifecycle rule
    # will expire it.
    try:
        s3.delete_object(Bucket=bucket, Key=staging_key)
    except Exception as e:
        print(f"Failed to clean up staging object {staging_key}: {e}")

    # Mongo values (datetime, ObjectId) are not JSON-serializable as-is.
    serializable_metadata = {k: str(v) for k, v in metadata.items()}

    return jsonify({
        "fileId": str(inserted_id),
        "s3_key": s3_key,
        "metadata": serializable_metadata,
    }), 201


@mrds_bp.route("/uploads/<upload_id>/abort", methods=["POST"])
def abort_upload(upload_id):
    """
    Discard a staged upload after a client-side cancel or failure. Always succeeds;
    anything missed here is reaped by the staging prefix lifecycle rule.
    """
    object_id = _parse_upload_id(upload_id)
    if object_id is not None:
        try:
            boto3.client("s3").delete_object(
                Bucket=current_app.config['S3_BUCKET'],
                Key=_staging_key(object_id),
            )
        except Exception as e:
            print(f"Failed to abort upload {upload_id}: {e}")
    return "", 204

@mrds_bp.route("/mrd-file", methods=["DELETE"])
def delete_files():
    try:
        file_ids = request.json.get("ids", [])
        if not file_ids:
            return jsonify({"error": "No file IDs provided"}), 400

        # Setup AWS S3 client
        s3 = boto3.client("s3")
        BUCKET = current_app.config['S3_BUCKET']
        
        # Get database connection
        from data import get_db, delete_mrdfiles_by_ids
        db = get_db()
        
        deleted_count = 0
        s3_deleted_count = 0
        file_results = []
        
        for file_id in file_ids:
            try:
                # First, get the file document to find the S3 key
                file_doc = db.mrdfiles.find_one({"_id": ObjectId(file_id)})
                
                if file_doc:
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
                            s3.delete_object(Bucket=BUCKET, Key=file_doc['s3_key'])
                            s3_deleted_count += 1
                            file_result["s3_deleted"] = True
                        except Exception as s3_error:
                            error_msg = f"Error deleting from S3: {str(s3_error)}"
                            print(f"Error deleting from S3 for file {file_id}: {s3_error}")
                            file_result["status"] = "error"
                            file_result["error"] = error_msg
                    
                    # Delete from MongoDB
                    try:
                        result = db.mrdfiles.delete_one({"_id": ObjectId(file_id)})
                        if result.deleted_count > 0:
                            deleted_count += 1
                            file_result["db_deleted"] = True
                    except Exception as db_error:
                        error_msg = f"Error deleting from database: {str(db_error)}"
                        print(f"Error deleting from database for file {file_id}: {db_error}")
                        file_result["status"] = "error"
                        file_result["error"] = error_msg
                        
                    file_results.append(file_result)
                else:
                    file_results.append({
                        "file_id": file_id,
                        "file_name": "Unknown",
                        "status": "error",
                        "db_deleted": False,
                        "s3_deleted": False,
                        "error": "File not found in database"
                    })
                        
            except Exception as file_error:
                print(f"Error processing file {file_id}: {file_error}")
                file_results.append({
                    "file_id": file_id,
                    "file_name": "Unknown",
                    "status": "error",
                    "db_deleted": False,
                    "s3_deleted": False,
                    "error": str(file_error)
                })
                continue
        
        return jsonify({
            "message": f"Successfully deleted {deleted_count} files from database and {s3_deleted_count} files from S3",
            "deleted_count": deleted_count,
            "s3_deleted_count": s3_deleted_count,
            "file_results": file_results
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete files", "details": str(e)}), 400

@mrds_bp.route("/mrd-file/<int:file_id>/download")
def download_file(file_id):
    # download file
    pass
