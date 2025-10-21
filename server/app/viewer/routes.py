from flask import jsonify, request
import numpy as np
import os
from werkzeug.utils import secure_filename

from app.viewer.magnets import (
    hupc_processing,
    clinical_processing,
    mr_solutions_processing,
)
from data import (
    get_image_array_from_mrdfile,
    get_pulse_array_from_mrdfile,
    get_mrdfile_by_id_with_auth
)
import app.external.python.mrd as mrd
from app.auth import requires_auth

from app.viewer import viewer_bp

@viewer_bp.route("/viewer/<file_id>", methods=["GET"])
@requires_auth
def fetch_image_array_from_bucket(file_id: str):
    """
    Load image array from S3 bucket and return as JSON serializable nested lists.
    @param file_id: file_id in mongodb of the mrd file
    function: get_image_array_from_mrdfile
        @return image_array: 6d nparray of dimension (channel, slice, rows, cols, frequencies, measurements)
        @return nmr_labels: list of label of metabolites. If metabolite dimension is 0, return []
    """
    try:
        # Check if user has access to this file
        from flask import g
        file_doc = get_mrdfile_by_id_with_auth(file_id, g.user_sub)
        if not file_doc:
            return jsonify({"error": "File not found or access denied"}), 404
        
        img_array, nmr_labels = get_image_array_from_mrdfile(file_id)        
        return jsonify({"image_array": img_array.tolist(), "nmr_labels": nmr_labels}), 200
    except FileNotFoundError:
        return jsonify({"error": f"File-{file_id} not found on S3 bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@viewer_bp.route("/viewer/get_pulse_array/<file_id>", methods=["GET"])
@requires_auth
def fetch_pulse_array_from_bucket(file_id: str):
    """
    Load pulse array from S3 bucket and return as JSON serializable nested lists.
    @param file_id: file_id in mongodb of the mrd file
    @return
        - pulse_data: pulse data of float32 (channels, samples)
        - pulse_phase: pulse phase of float32 with 1D shape (samples,)
    """
    try:
        # Check if user has access to this file
        from flask import g
        file_doc = get_mrdfile_by_id_with_auth(file_id, g.user_sub)
        if not file_doc:
            return jsonify({"error": "File not found or access denied"}), 404
        
        pulse_data, pulse_phase = get_pulse_array_from_mrdfile(file_id)
        return jsonify({
            "pulse_data": pulse_data.tolist() if pulse_data is not None else [],
            "pulse_phase": pulse_phase.tolist() if pulse_phase is not None else []}), 200
            # "start_time": start_time if start_time is not None else [],
            # "dt": dt if dt is not None else []}), 200
    except FileNotFoundError:
        return jsonify({"error": f"File-{file_id} not found on S3 bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@viewer_bp.route("/viewer/get_gradient_array/<file_id>", methods=["GET"])
@requires_auth
def fetch_gradient_array_from_bucket(file_id: str):
    """
    Load gradient array from S3 bucket and return as JSON serializable nested lists.
    @param file_id: file_id in mongodb of the mrd file
    @return
        - gradient_data: gradient data of float32 (channels, samples)
    """
    try:
        # Check if user has access to this file
        from flask import g
        file_doc = get_mrdfile_by_id_with_auth(file_id, g.user_sub)
        if not file_doc:
            return jsonify({"error": "File not found or access denied"}), 404
        
        # TODO: Implement gradient extraction function
        # gx, gy, gz = get_gradient_from_mrdfile(file_id)
        return jsonify({"gx": [], "gy": [], "gz": []}), 200
    except FileNotFoundError:
        return jsonify({"error": f"File-{file_id} not found on S3 bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@viewer_bp.route("/get_count_datasets/<magnet_type>", methods=["GET"])
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


@viewer_bp.route("/get_proton_picture/<int:slider_value>", methods=["POST"])
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


@viewer_bp.route("/get_hp_mri_data/<int:hp_mri_dataset>", methods=["POST"])
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

# upload dicom files for comparison
@viewer_bp.route("/viewer-upload", methods=["POST"])
def file_upload():
    """
    Upload dicom files from Viewer page to  to a predefined upload folder.

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


@viewer_bp.route("/get_imaging_metadata", methods=["GET"])
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
        data_path = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project5 HP-MRI/untitled folder/mock_mri_heatmap_data/mock_mri_heatmap_varied_trend.npy"
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


@viewer_bp.route("/get_imaging_matrix", methods=["GET"])
def get_imaging_matrix():
    """
    Retrieve the full 4D imaging matrix as nested lists for frontend consumption.

    Returns:
        json: { "matrix": number[rows][cols][metabolites][images] }

    Author: Ben Yoon (extended)
    Date: 2025-03-04
    Version: 2.0.2
    """
    try:
        data_path = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project5 HP-MRI/untitled folder/mock_mri_heatmap_data/mock_mri_heatmap_varied_trend.npy"
        data = np.load(data_path)  # Expected shape: [rows, columns, metabolites, images]

        if data.ndim != 4:
            return jsonify({"error": "Imaging data must be 4-dimensional"}), 400

        return jsonify({"matrix": data.tolist()}), 200
    except FileNotFoundError:
        return jsonify({"error": "Mock imaging data file not found."}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
