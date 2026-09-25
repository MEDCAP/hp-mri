from flask import jsonify, request
import numpy as np
import os
from werkzeug.utils import secure_filename

from app.viewer.magnets import (
    hupc_processing,
    clinical_processing,
    mr_solutions_processing,
)
from app.errors import BadRequest, NotFound
from data import list_mrd_arrays, get_mrd_array


from app.viewer import viewer_bp

# Per-magnet capability table, replacing the if/elif chain that used to be
# written out in each of the handlers below. The zero-returning entries are not
# oversights: they preserve what the chains did. MR Solutions does have a
# process_hpmri_data(), but the route has always returned 0 for it, and wiring
# it up is a behaviour change rather than part of this refactor.
_MAGNETS = {
    "HUPC": {
        "count": hupc_processing.count_datasets,
        "proton": hupc_processing.process_proton_picture,
        "hp_mri": hupc_processing.process_hp_mri_data,
    },
    "Clinical": {
        "count": lambda: 0,
        "proton": clinical_processing.process_proton_picture,
        "hp_mri": lambda dataset, threshold: 0,
    },
    "MR Solutions": {
        "count": mr_solutions_processing.count_datasets,
        "proton": mr_solutions_processing.process_proton_picture,
        "hp_mri": lambda dataset, threshold: 0,
    },
}


def _magnet(magnet_type, capability):
    """
    Resolve a magnet pipeline function, or raise the single 400 that used to be
    spelled out at the end of every dispatch chain.
    """
    try:
        return _MAGNETS[magnet_type][capability]
    except KeyError:
        raise BadRequest(f"Invalid magnet type: {magnet_type}") from None


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
    arrays, unsupported = list_mrd_arrays(file_id)
    return jsonify({"file_id": file_id, "arrays": arrays, "unsupported": unsupported}), 200

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
    except KeyError:
        # A bare KeyError elsewhere is a defect; here it is a real 404, so it is
        # translated at the only place that knows which of the two it is.
        raise NotFound(f"Unknown array key: {key}") from None


@viewer_bp.route("/get_count_datasets/<magnet_type>", methods=["GET"])
def fetch_count_datasets(magnet_type):
    """
    API endpoint to fetch the number of datasets.

    Parameters:
        magnet_type: The magnet type current selected.

    Returns:
        JSON: Contains the number of datasets.
    """
    return jsonify({"numDatasets": _magnet(magnet_type, "count")()})


@viewer_bp.route("/get_proton_picture/<int:slider_value>", methods=["POST"])
def get_proton_picture(slider_value: int):
    """
    Retrieve and return an image based on a given slider value by loading the corresponding DICOM file.

    Parameters:
        slider_value (int): The slider value corresponding to the desired image.

    Returns:
        Flask Response: The image file.

    Author: Benjamin Yoon
    Date: 2024-04-30
    Version: 1.2.2
    """
    data = request.get_json()
    magnet_type = data.get("magnetType", "HUPC")  # Default to HUPC if not specified
    return _magnet(magnet_type, "proton")(slider_value, data)


@viewer_bp.route("/get_hp_mri_data/<int:hp_mri_dataset>", methods=["POST"])
def get_hp_mri_data(hp_mri_dataset):
    """
    Retrieve and return HP MRI data for a specified dataset ID with dynamic thresholding for data visualization.

    Parameters:
        hp_mri_dataset (int): The dataset ID for which to fetch HP MRI data.

    Returns:
        json: JSON containing MRI data.

    Author: Benjamin Yoon
    Date: 2024-04-30
    Version: 1.2.2
    """
    threshold = request.args.get("threshold", default=0.2, type=float)
    magnet_type = request.args.get(
        "magnetType", "HUPC"
    )  # Default to HUPC if not specified
    return _magnet(magnet_type, "hp_mri")(hp_mri_dataset, threshold)


# upload dicom files for comparison
@viewer_bp.route("/viewer-upload", methods=["POST"])
def file_upload():
    """
    Upload dicom files from Viewer page to a predefined upload folder.

    BROKEN: UPLOAD_FOLDER is not defined anywhere in the tree, so this raises
    NameError on every call. Left as-is deliberately — it now fails loudly with
    a logged traceback through the shared error handler instead of being masked
    as a hand-rolled 500. Tracked separately.

    Returns:
        json: A JSON object indicating the status of the file upload.
    """
    uploaded_files = request.files.getlist("files")
    for file in uploaded_files:
        if file:
            filename = secure_filename(file.filename)
            save_path = os.path.join(UPLOAD_FOLDER, filename)  # noqa: F821
            file.save(save_path)
    return jsonify({"status": "success"}), 200


@viewer_bp.route("/get_imaging_metadata", methods=["GET"])
def get_imaging_metadata():
    """
    Retrieve metadata for imaging-mode MRI dataset.

    BROKEN: reads a hardcoded path on a former developer's laptop, so this only
    ever worked on one machine. Tracked separately; the missing file now surfaces
    as a 404 through the shared FileNotFoundError handler.

    Returns:
        json: JSON containing the number of rows, columns, metabolites, and image slices.

    Author: Ben Yoon
    Date: 2025-03-04
    Version: 2.0.1
    """
    data_path = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project5 HP-MRI/untitled folder/mock_mri_heatmap_data/mock_mri_heatmap_varied_trend.npy"
    data = np.load(data_path)  # Expected shape: [rows, columns, metabolites, images]

    if data.ndim != 4:
        raise BadRequest("Imaging data must be 4-dimensional")

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
