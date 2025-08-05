from flask import jsonify, request, current_app
import os
import boto3
from bson import json_util
import json
from werkzeug.utils import secure_filename

# list, insert mongodb functions
from data import list_all_mrdfiles, insert_mrdfile_header  
# read mrd header function
from data import read_mrdfile_header

# flask blueprint for mrds route
from . import mrds_bp

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
    # setup aws s3 client
    s3 = boto3.client("s3")
    BUCKET = current_app.config['S3_BUCKET']

    if "file" not in request.files:
        return jsonify({"error": "No files selected"}), 400
    # tmpdata dir to store files locally before uploading to s3 at "./tmpdata"
    upload_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "tmpdata")
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    errors = {}
    for file in request.files.getlist("file"):
        # save file locally in temporary storage to read mrd file header
        filename = secure_filename(file.filename)
        filepath = os.path.join(upload_path, filename)
        file.save(filepath)
        # read mrd file header as dict
        try:
            db_entry = read_mrdfile_header(filepath)
        except Exception as e:
            errors[file.filename] = f"Could not read mrdfile header: {e}"
        # insert extracted db_entry to db
        try:
            inserted_id = insert_mrdfile_header(db_entry)
        except Exception as e:
            errors[file.filename] = f"Error inserting mrd header document to db: {e}"
        # upload to s3 bucket with filename=inserted_id of mongodb
        try:
            s3_filename = inserted_id
            s3.upload_file(filepath, BUCKET, s3_filename)
        except Exception as e:
            return jsonify({"aws access error to upload mrd file to s3": e}), 400

        finally:
            # Always remove the local file after processing
            if os.path.exists(filepath):
                os.remove(filepath)            
        return jsonify({"message": "Files processed"}), 200


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
