from flask import jsonify, request
import os
import boto3
from bson import json_util
import json
from werkzeug.utils import secure_filename

# Use the new data access functions
from data import list_all_mrdfiles
from . import mrds_bp

# setup aws s3 client
s3 = boto3.client("s3")
BUCKET = "mrissim-app-user-content"

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
            "_id": 1
        }
        sorted_cursor = list_all_mrdfiles(projection=proj)
        return json_util.dumps(list(sorted_cursor))
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

# Route to upload MRD file page
@mrds_bp.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No files selected"}), 400
    # tmpdata dir to store files locally before uploading to s3 at "./tmpdata"
    upload_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "tmpdata")
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    for file in request.files.getlist("file"):
        # save file locally in temporary storage
        filepath = os.path.join(upload_path, file.filename)
        file.save(filepath)
        try:
            # upload to s3 as original name
            s3.upload_file(filepath, BUCKET, file.filename)
        except Exception as e:
            return jsonify({"aws access error": e}), 400
        # remove local file
        os.remove(filepath)
    return jsonify({"message": "files uploaded"}), 200
# # Route to upload MRD file page
# @mrds_bp.route("/upload", methods=["POST"])
# def upload_file():
#     if "file" not in request.files:
#         return jsonify({"error": "No files selected"}), 400
    
#     files = request.files.getlist("file")
#     responses = []
#     # tmpdata dir to store files locally before uploading to s3 at "./tmpdata"
#     upload_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "tmpdata")
#     if not os.path.exists(upload_path):
#         os.makedirs(upload_path)
#     for file in files:
#         try:
#             # Sanitize the filename to prevent security risks
#             filename = secure_filename(file.filename)
#             filepath = os.path.join(upload_path, filename)
#             # Save the file temporarily to a secure path
#             file.save(filepath)
#             try:
#                 db_entry = read_mrdfile_header(filepath)
#             except Exception as e:
#                 errors[file.filename] = f"Could not read mrdfile header: {e}"
            
#             # insert extracted db_entry to db
#             try:
#                 inserted_id = insert_mrdfile_header()
#             except Exception as e:
#                 errors[file.filename] = f"Error reading header from mrd file: {e}"
        

#             finally:
#                 # Always remove the local file after processing
#                 if os.path.exists(filepath):
#                     os.remove(filepath)
#         elif file:
#             errors[file.filename] = "File type not allowed"

#     if errors:
#         return jsonify({"error": "File upload failed", "details": errors}), 400
        
#     return jsonify({"message": "Files processed", "errors": errors}), 200


@mrds_bp.route("/mrd-file", methods=["DELETE"])
def delete_files():
    global db_mrd
    file_ids = request.json.get("ids", [])
    if not file_ids:
        return jsonify({"error": "No file IDs provided"}), 400

    db_mrd = [file for file in db_mrd if file["id"] not in file_ids]
    return jsonify({"message": "Files deleted successfully"}), 200


@mrds_bp.route("/mrd-file/<int:file_id>/download")
def download_file(file_id):
    # download file
    pass
