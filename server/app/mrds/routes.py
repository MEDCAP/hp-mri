from flask import jsonify, request
import os
import boto3

# Temporary mock data
# Deprecated mock data imports are kept for legacy routes; new routes use real DB
from data import db_mrd_files
from . import mrds_bp 

# setup aws s3 client
s3 = boto3.client("s3")
BUCKET = "mrissim-app-user-content"

# Route to list MRD files
@mrds_bp.route("/mrd-files", methods=["GET"])
def show_files():
    """Return a list of MRD files with selected fields from MongoDB."""

    # Only include the subset of fields required by the frontend table
    display_mrd_files = [
        {
            "id": file["_id"],
            "file_name": file["file_name"],
            "study_date": file["study_date"],
            "owner": file["uploader_name"],
            "reconImagesCount": file[''],
            "isSelected": False,
        }
        for file in files
    ]
    return jsonify(display_mrd_files)

# Route to retrieve specific file details
@mrds_bp.route("/mrd-files/<file_id>", methods=["GET"])
def get_file_details(file_id):
    try:
        # Convert file_id to an integer for comparison
        file_id = int(file_id)
        file_data = next((file for file in db_mrd if file["id"] == file_id), None)
        if file_data:
            return jsonify(file_data)
        return jsonify({"error": "File not found"}), 404
    except ValueError:
        # If file_id is not a valid integer, return an error
        return jsonify({"error": "Invalid file ID"}), 400


# Route to update file tags
@mrds_bp.route("/mrd-files/<file_id>/edit-tags", methods=["POST"])
def edit_file_tags(file_id):
    try:
        file_id = int(file_id)
        new_tags = request.json.get("tags")
        for file in db_mrd:
            if file["id"] == file_id:
                # Update the 'parameter' tag
                file["parameter"] = new_tags.get("parameter", file["parameter"])

                # Update the 'description' field inside 'raw'
                if "raw" in file and isinstance(file["raw"], dict):
                    file["raw"]["description"] = new_tags.get(
                        "raw", file["raw"].get("description", "")
                    )

                return jsonify({"message": "Tags updated successfully"})
        return jsonify({"error": "File not found"}), 404
    except ValueError:
        return jsonify({"error": "Invalid file ID"}), 400

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
            # read meta information using helper function as JSON
            db_entry = read_header(filepath)
            # encode db_entry into mongodb

            # construct a filename
            filename = uid
            filepath = os.path.join(upload_path, filename)
            # upload to s3 as original name
            s3.upload_file(filepath, BUCKET, filename)
        except Exception as e:
            return jsonify({"aws access error": e}), 400
        # remove local file
        os.remove(filepath)
    return jsonify({"message": "files uploaded"}), 200


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



'''
Simulator section should be a separate folder
'''
# # Route to list Simulators
# @mrds_bp.route("/simulator", methods=["GET"])
# def show_simulator():
#     filtered_simulator = [
#         {
#             "id": simulator["id"],
#             "name": simulator["name"],
#             "date": simulator["date"],
#             "owner": simulator["owner"],
#             "sequence": simulator["sequence"],
#             "image": simulator["image"],
#             "isSelected": simulator["isSelected"],
#         }
#         for simulator in db_simulator
#     ]
#     return jsonify(filtered_simulator)


# @mrds_bp.route("/simluators", methods=["DELETE"])
# def delete_simulator():
#     global db_simulator
#     simulator_ids = request.json.get("ids", [])
#     if not simulator_ids:
#         return jsonify({"error": "No simulator IDs provided"}), 400

#     db_simulator = [
#         simulator for simulator in db_simulator if simulator["id"] not in simulator_ids
#     ]
#     return jsonify({"message": "Simulator deleted successfully"}), 200