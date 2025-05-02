from flask import Flask, jsonify, request, Blueprint
from flask_cors import CORS
import numpy as np

# from magnets import hupc_processing, clinical_processing, mr_solutions_processing
from visualize.magnets import (
    hupc_processing,
    clinical_processing,
    mr_solutions_processing,
)
import os
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cv2

bp = Blueprint("visualization", __name__)
# Apply CORS to the blueprint
CORS(bp, resources={r"/*": {"origins": "http://localhost:5173"}})

from flask import Flask, request, jsonify

# Constants
UPLOAD_FOLDER = "/Users/zhouzih/Documents/Programming/MEDCAP/mock_mri_heatmap_data/data"
app = Flask(__name__)
CORS(app)


@bp.route("/get_num_slider_values/<magnet_type>", methods=["GET"])
def fetch_num_slider_values(magnet_type):
    """
    API endpoint to fetch the number of slider values.

    Parameters:
        magnet_type: The magnet type current selected.

    Returns:
        JSON: Contains the number of slider values.
    """
    if magnet_type == "HUPC":
        num_values = hupc_processing.get_num_slider_values()
    elif magnet_type == "Clinical":
        num_values = 0
    elif magnet_type == "MR Solutions":
        num_values = mr_solutions_processing.get_num_slider_values()
    else:
        return jsonify({"error": "Invalid magnet type"}), 400

    return jsonify({"numSliderValues": num_values})


@bp.route("/get_count_datasets/<magnet_type>", methods=["GET"])
def fetch_count_datasets(magnet_type):
    """
    API endpoint to fetch the number of datasets.

    Parameters:
        magnet_type: The magnet type current selected.

    Returns:
        JSON: Contains the number of datasets.
    """
    if magnet_type == "HUPC":
        num_values = hupc_processing.count_datasets()
    elif magnet_type == "Clinical":
        num_values = 0
    elif magnet_type == "MR Solutions":
        num_values = mr_solutions_processing.count_datasets()
    else:
        return jsonify({"error": "Invalid magnet type"}), 400

    return jsonify({"numDatasets": num_values})


@bp.route("/get_proton_picture/<int:slider_value>", methods=["POST"])
def get_proton_picture(slider_value: int):
    """
    Retrieve and return an image based on a given slider value by loading the corresponding DICOM file.

    Parameters:
        slider_value (int): The slider value corresponding to the desired image.

    Returns:
        Flask Response: Either the image file or a JSON object indicating an error.

    Author: Benjamin Yoon
    Date: 2024-04-30
    Version: 1.2.2
    """
    data = request.get_json()
    magnet_type = data.get("magnetType", "HUPC")  # Default to HUPC if not specified

    if magnet_type == "HUPC":
        result = hupc_processing.process_proton_picture(slider_value, data)
    elif magnet_type == "Clinical":
        result = clinical_processing.process_proton_picture(slider_value, data)
    elif magnet_type == "MR Solutions":
        result = mr_solutions_processing.process_proton_picture(slider_value, data)
    else:
        return jsonify({"error": "Invalid magnet type"}), 400

    return result


@bp.route("/get_hp_mri_data/<int:hp_mri_dataset>", methods=["POST"])
def get_hp_mri_data(hp_mri_dataset):
    """
    Retrieve and return HP MRI data for a specified dataset ID with dynamic thresholding for data visualization.

    Parameters:
        hp_mri_dataset (int): The dataset ID for which to fetch HP MRI data.

    Returns:
        json: JSON containing MRI data or an error message.

    Author: Benjamin Yoon
    Date: 2024-04-30
    Version: 1.2.2
    """
    threshold = request.args.get("threshold", default=0.2, type=float)
    magnet_type = request.args.get(
        "magnetType", "HUPC"
    )  # Default to HUPC if not specified

    if magnet_type == "HUPC":
        result = hupc_processing.process_hp_mri_data(hp_mri_dataset, threshold)
    elif magnet_type == "Clinical":
        result = 0
    elif magnet_type == "MR Solutions":
        result = 0
    else:
        return jsonify({"error": "Invalid magnet type"}), 400

    return result


@bp.route("/visualize-upload", methods=["POST"])
def file_upload():
    """
    Handle file uploads by saving uploaded files to a predefined upload folder.

    Returns:
        json: A JSON object indicating the status of the file upload (success or error).
    """
    try:
        uploaded_files = request.files.getlist("files")
        for file in uploaded_files:
            if file:
                filename = secure_filename(file.filename)
                save_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(save_path)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route("/get_imaging_metadata", methods=["GET"])
def get_imaging_metadata():
    """
    Retrieve metadata for imaging-mode MRI dataset.

    Returns:
        json: JSON containing the number of rows, columns, metabolites, and image slices.

    Author: Ben Yoon
    Date: 2025-03-04
    Version: 2.0.1
    """
    try:
        data_path = "/Users/zhouzih/Documents/Programming/MEDCAP/mock_mri_heatmap_data/mock_mri_heatmap_varied_trend.npy"
        data = np.load(
            data_path
        )  # Expected shape: [rows, columns, metabolites, images]

        if data.ndim != 4:
            return jsonify({"error": "Imaging data must be 4-dimensional"}), 400

        rows, cols, num_metabolites, num_images = data.shape

        return (
            jsonify(
                {
                    "rows": rows,
                    "columns": cols,
                    "numMetabolites": num_metabolites,
                    "numImages": num_images,
                }
            ),
            200,
        )

    except FileNotFoundError:
        return jsonify({"error": "Mock imaging data file not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/get_imaging_matrix", methods=["GET"])
def get_imaging_matrix():
    """
    Retrieve the full 4D mock MRI imaging matrix (rows x cols x metabolites x images).

    Returns:
        json: JSON containing a nested list representing the 4D matrix.

    Author: Ben Yoon
    Date: 2025-03-04
    Version: 2.0.1
    """
    try:
        data_path = "/Users/zhouzih/Documents/Programming/MEDCAP/mock_mri_heatmap_data/mock_mri_heatmap_varied_trend.npy"
        data = np.load(data_path)

        if data.ndim != 4:
            return jsonify({"error": "Imaging data must be 4-dimensional"}), 400

        # Convert to list (costly for large data, but fine for dev)
        matrix = data.tolist()

        return jsonify({"matrix": matrix}), 200

    except FileNotFoundError:
        return jsonify({"error": "Mock imaging data file not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
