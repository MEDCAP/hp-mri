from flask import Blueprint, jsonify, request
from flask_cors import CORS

# Temporary mock data
# TODO: Replace with RDS Database for quick querying on file details
# TODO: When uploading actual file to S3 Bucket, add to this database
from data import db_mrd
from data import db_image
from data import db_simulator

bp = Blueprint("mrds", __name__)

# Apply CORS to the blueprint
CORS(bp, resources={r"/*": {"origins": "http://localhost:5173"}})


# Root route just to test the server is running
@bp.route("/")
def index():
    return jsonify({"message": "Flask backend is running!"})


# Route to list MRD files
@bp.route("/mrd-files", methods=["GET"])
def show_files():
    # Transform the data to include only the specified fields
    filtered_files = [
        {
            "id": file["id"],
            "name": file["name"],
            "date": file["date"],
            "owner": file["owner"],
            "reconImagesCount": file["reconImagesCount"],
            "isSelected": file["isSelected"],
        }
        for file in db_mrd
    ]
    return jsonify(filtered_files)


# Route to retrieve specific file details
@bp.route("/mrd-files/<file_id>", methods=["GET"])
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
@bp.route("/mrd-files/<file_id>/edit-tags", methods=["POST"])
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


# Route to list Images
@bp.route("/images", methods=["GET"])
def show_images():
    # Mock data (replace this with real database queries later)
    return jsonify(db_image)


# Route to list MRD files
@bp.route("/simulator", methods=["GET"])
def show_simulator():
    # Mock data (replace this with real database queries later)
    return jsonify(db_simulator)


# Route to upload MRD file page
@bp.route("/upload", methods=["POST"])
def upload_file():
    # This is where you will implement the file upload logic
    return jsonify({"message": "File upload endpoint is ready!"})


@bp.route("/mrd-file/<int:file_id>", methods=["DELETE"])
def delete_file(file_id):
    # Find the file by ID and delete it
    db_mrd = [file for file in db_mrd if file["id"] != file_id]
    return jsonify({"message": "File deleted successfully"}), 200


@bp.route("/mrd-file/<int:file_id>/download")
def download_file(file_id):
    # download file
    pass
