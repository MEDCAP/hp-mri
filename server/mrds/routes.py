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
    # Transform the data to include only the specified fields
    filtered_images = [
        {
            "id": image["id"],
            "name": image["name"],
            "date": image["date"],
            "owner": image["owner"],
            "sequence_id": image["sequence_id"],
            "sequence": image["sequence"],
            "isSelected": image["isSelected"],
        }
        for image in db_image
    ]
    return jsonify(filtered_images)


# Route to retrieve images by sequence_id
@bp.route("/images/<int:sequence_id>", methods=["GET"])
def get_images_by_sequence(sequence_id):
    images = [image for image in db_image if image["sequence_id"] == sequence_id]
    return jsonify(images)


@bp.route("/images/delete", methods=["DELETE"])
def delete_images():
    global db_image
    image_ids = request.json.get("ids", [])
    if not image_ids:
        return jsonify({"error": "No image IDs provided"}), 400

    db_image = [image for image in db_image if image["id"] not in image_ids]
    return jsonify({"message": "Images deleted successfully"}), 200


# Route to retrieve specific image file details
@bp.route("/image-details/<image_id>", methods=["GET"])
def get_image(image_id):
    try:
        image_id = int(image_id)
        image_data = next(
            (image for image in db_image if image["id"] == image_id), None
        )
        if image_data:
            return jsonify(image_data)
        return jsonify({"error": "Image not found"}), 404
    except ValueError:
        return jsonify({"error": "Invalid image ID"}), 400


# TODO: Route to get actual image associated with this image id from
# the s3 bucket and return it to the frontend
@bp.route("/image/<int:image_id>/", methods=["GET"])
def get_image_details(image_id):
    return jsonify({"message": "TODO: Display Image"})


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


@bp.route("/mrd-file", methods=["DELETE"])
def delete_files():
    global db_mrd
    file_ids = request.json.get("ids", [])
    if not file_ids:
        return jsonify({"error": "No file IDs provided"}), 400

    db_mrd = [file for file in db_mrd if file["id"] not in file_ids]
    return jsonify({"message": "Files deleted successfully"}), 200


@bp.route("/mrd-file/<int:file_id>/download")
def download_file(file_id):
    # download file
    pass
