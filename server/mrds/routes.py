from flask import Blueprint, jsonify, Flask, request
from flask_cors import CORS

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
    # Mock data (replace this with real database queries later)
    files = [
        {
            "name": "Sequence 1",
            "date": "2024-10-18",
            "owner": "MEDCAP",
            "reconImagesCount": 12,
            "isSelected": False,
        },
        {
            "name": "Sequence 2",
            "date": "2024-10-17",
            "owner": "Ben Yoon",
            "reconImagesCount": 8,
            "isSelected": False,
        },
        {
            "name": "Sequence 3",
            "date": "2024-10-16",
            "owner": "Kento",
            "reconImagesCount": 15,
            "isSelected": False,
        },
        {
            "name": "Sequence 3",
            "date": "2024-10-16",
            "owner": "Zihao",
            "reconImagesCount": 15,
            "isSelected": False,
        },
    ]
    return jsonify(files)


# Route to list Images
@bp.route("/images", methods=["GET"])
def show_images():
    # Mock data (replace this with real database queries later)
    files = [
        {
            "name": "Image 1",
            "date": "2024-10-18",
            "owner": "MEDCAP",
            "sequence": "Sequence 1",
            "isSelected": False,
        },
        {
            "name": "Image 2",
            "date": "2024-10-17",
            "owner": "Ben Yoon",
            "sequence": "Sequence 2",
            "isSelected": False,
        },
        {
            "name": "Image 3",
            "date": "2024-10-16",
            "owner": "Kento",
            "sequence": "Sequence 3",
            "isSelected": False,
        },
        {
            "name": "Image 4",
            "date": "2024-10-15",
            "owner": "Zihao",
            "sequence": "Sequence 4",
            "isSelected": False,
        },
    ]
    return jsonify(files)


# Route to list MRD files
@bp.route("/simulator", methods=["GET"])
def show_simulator():
    # Mock data (replace this with real database queries later)
    files = [
        {
            "name": "Simulator 1",
            "date": "2024-10-18",
            "owner": "MEDCAP",
            "sequence": "Sequence 1",
            "image": "Image 1",
            "isSelected": False,
        },
        {
            "name": "Simulator 2",
            "date": "2024-10-17",
            "owner": "Ben Yoon",
            "sequence": "Sequence 2",
            "image": "Image 2",
            "isSelected": False,
        },
        {
            "name": "Simulator 3",
            "date": "2024-10-16",
            "owner": "Kento",
            "sequence": "Sequence 3",
            "image": "Image 3",
            "isSelected": False,
        },
        {
            "name": "Simulator 4",
            "date": "2024-10-15",
            "owner": "Zihao",
            "sequence": "Sequence 4",
            "image": "Image 4",
            "isSelected": False,
        },
    ]
    return jsonify(files)


# Route to upload MRD file page
@bp.route("/upload", methods=["POST"])
def upload_file():
    # This is where you will implement the file upload logic
    return jsonify({"message": "File upload endpoint is ready!"})


@bp.route("/file/<file_id>")
def select_file(file_id):
    # delete file
    # download file
    pass
