from flask import Flask, jsonify, request
from mrds import bp

# Root route just to test the server is running
@bp.route('/')
def index():
    return jsonify({"message": "Flask backend is running!"})

# Route to list MRD files
@bp.route('/files', methods=['GET'])
def show_files():
    # This is where you will implement file retrieval from a database
    return jsonify({"files": []})

# Route to upload MRD file page
@bp.route('/upload', methods=['POST'])
def upload_file():
    # This is where you will implement the file upload logic
    return jsonify({"message": "File upload endpoint is ready!"})

@bp.route('/file/<file_id>')
def select_file(file_id):
    # delete file
    # download file
    pass