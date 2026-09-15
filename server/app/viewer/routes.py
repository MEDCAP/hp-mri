from flask import jsonify, request
import numpy as np
import os
from werkzeug.utils import secure_filename

from app.viewer.magnets import (
    hupc_processing,
    clinical_processing,
    mr_solutions_processing,
)
from data import list_mrd_arrays, get_mrd_array


from app.viewer import viewer_bp

@viewer_bp.route("/viewer/<file_id>/arrays", methods=["GET"])
def fetch_array_list_from_bucket(file_id: str):
    """
    List every array the viewer can render from an MRD file, without any bulk data.
    @param file_id: file_id in mongodb of the mrd file
    @return
        - arrays: list of descriptors {key, name, kind, tag, shape, dim_labels,
                  labels, dtype, transform, item_count}
        - unsupported: list of {tag, count} for stream items that were skipped
    """
    try:
        arrays, unsupported = list_mrd_arrays(file_id)
        return jsonify({"file_id": file_id, "arrays": arrays, "unsupported": unsupported}), 200
    except FileNotFoundError:
        return jsonify({"error": f"File-{file_id} not found on S3 bucket"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@viewer_bp.route("/viewer/<file_id>/arrays/<key>", methods=["GET"])
def fetch_array_from_bucket(file_id: str, key: str):
    """
    Load one named array from an MRD file as JSON serializable nested lists.
    @param file_id: file_id in mongodb of the mrd file
    @param key: array key from the array list endpoint
    @return the array's descriptor plus
        - data: 6d nested lists (channel, slice, rows, cols, frequencies, measurements)
                when kind is "image", 3d (series, samples, measurements) when kind is "trace"
        - value_min / value_max: the array's unscaled value range
    """
    try:
        return jsonify(get_mrd_array(file_id, key)), 200
    except FileNotFoundError:
        return jsonify({"error": f"File-{file_id} not found on S3 bucket"}), 404
    except KeyError:
        return jsonify({"error": f"Unknown array key: {key}"}), 404
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

