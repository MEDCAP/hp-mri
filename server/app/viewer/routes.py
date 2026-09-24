from flask import jsonify, request, g
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
    get_mrdfile_by_id_with_auth,
    get_public_mrdfile_by_id
)
from app.auth import optional_auth
from app.errors import ApiError, BadRequest, NotFound

from app.viewer import viewer_bp


def _authorized_file(file_id):
    """
    The file document if the caller may see it, else a 404.

    Authenticated users see their own, their groups' and legacy public files;
    guests see files in the public group only. This was written out in each of
    the three routes below.
    """
    file_doc = (
        get_mrdfile_by_id_with_auth(file_id, g.user_sub)
        if g.user_sub
        else get_public_mrdfile_by_id(file_id)
    )
    if not file_doc:
        raise NotFound("File not found or access denied")
    return file_doc


def _unrenderable(exc):
    """
    Array extraction raises ValueError with messages we wrote ourselves --
    "No image data found", "Spectrum is displayed" -- which the viewer shows.
    They used to travel as str(e) in a 500 alongside every other exception;
    they are content problems, so 422 with the same safe text.
    """
    return ApiError(str(exc), code="unrenderable", status=422)


@viewer_bp.route("/viewer/<file_id>", methods=["GET"])
@optional_auth
def fetch_image_array_from_bucket(file_id: str):
    """
    Load image array from S3 bucket and return as JSON serializable nested lists.
    Authenticated users can access their own and group files.
    Unauthenticated guests can access public files only (groupName='public').
    """
    _authorized_file(file_id)
    try:
        img_array, nmr_labels = get_image_array_from_mrdfile(file_id)
    except ValueError as exc:
        raise _unrenderable(exc) from exc
    return jsonify({"image_array": img_array.tolist(), "nmr_labels": nmr_labels}), 200

@viewer_bp.route("/viewer/get_pulse_array/<file_id>", methods=["GET"])
@optional_auth
def fetch_pulse_array_from_bucket(file_id: str):
    """
    Load pulse array from S3 bucket and return as JSON serializable nested lists.
    Authenticated users can access their own and group files.
    Unauthenticated guests can access public files only (groupName='public').
    """
    _authorized_file(file_id)
    try:
        pulse_data, pulse_phase = get_pulse_array_from_mrdfile(file_id)
    except ValueError as exc:
        raise _unrenderable(exc) from exc
    return jsonify({
        "pulse_data": pulse_data.tolist() if pulse_data is not None else [],
        "pulse_phase": pulse_phase.tolist() if pulse_phase is not None else []
    }), 200

@viewer_bp.route("/viewer/get_gradient_array/<file_id>", methods=["GET"])
@optional_auth
def fetch_gradient_array_from_bucket(file_id: str):
    """
    Load gradient array from S3 bucket and return as JSON serializable nested lists.
    Authenticated users can access their own and group files.
    Unauthenticated guests can access public files only (groupName='public').
    """
    _authorized_file(file_id)
    # TODO: Implement gradient extraction function
    # gx, gy, gz = get_gradient_from_mrdfile(file_id)
    return jsonify({"gx": [], "gy": [], "gz": []}), 200


# Per-magnet capability table, replacing an if/elif chain repeated in three
# handlers. Entries name (module, attribute) and resolve per call, so the
# pipeline functions stay patchable. The zero-returning entries preserve what
# the chains did.
def _zero(*_args, **_kwargs):
    return 0


_MAGNETS = {
    "HUPC": {
        "count": (hupc_processing, "count_datasets"),
        "proton": (hupc_processing, "process_proton_picture"),
        "hp_mri": (hupc_processing, "process_hp_mri_data"),
    },
    "Clinical": {
        "count": _zero,
        "proton": (clinical_processing, "process_proton_picture"),
        "hp_mri": _zero,
    },
    "MR Solutions": {
        "count": (mr_solutions_processing, "count_datasets"),
        "proton": (mr_solutions_processing, "process_proton_picture"),
        "hp_mri": _zero,
    },
}


def _magnet(magnet_type, capability):
    try:
        entry = _MAGNETS[magnet_type][capability]
    except KeyError:
        raise BadRequest("Invalid magnet type") from None
    if callable(entry):
        return entry
    module, attribute = entry
    return getattr(module, attribute)


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
        Flask Response: Either the image file or a JSON object indicating an error.

    Author: Benjamin Yoon
    Date: 2024-04-30
    Version: 1.2.2
    """
    data = request.get_json(silent=True) or {}
    magnet_type = data.get("magnetType", "HUPC")  # Default to HUPC if not specified
    return _magnet(magnet_type, "proton")(slider_value, data)


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
    return _magnet(magnet_type, "hp_mri")(hp_mri_dataset, threshold)

# upload dicom files for comparison
@viewer_bp.route("/viewer-upload", methods=["POST"])
def file_upload():
    """
    Upload dicom files from Viewer page to  to a predefined upload folder.

    BROKEN: UPLOAD_FOLDER is not defined anywhere, so this raises NameError on
    every call. Left as-is deliberately; it now fails with a logged traceback
    instead of returning the exception text. Tracked in docs/KNOWN-ISSUES.md.

    Returns:
        json: A JSON object indicating the status of the file upload (success or error).
    """
    uploaded_files = request.files.getlist("files")
    for file in uploaded_files:
        if file:
            filename = secure_filename(file.filename)
            save_path = os.path.join(UPLOAD_FOLDER, filename)  # noqa: F821  # pylint: disable=undefined-variable
            file.save(save_path)
    return jsonify({"status": "success"}), 200


# Mock data on a former developer's laptop. BROKEN everywhere else: the missing
# file surfaces as a 404 through the shared FileNotFoundError handler. Tracked
# in docs/KNOWN-ISSUES.md.
_MOCK_IMAGING_PATH = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project5 HP-MRI/untitled folder/mock_mri_heatmap_data/mock_mri_heatmap_varied_trend.npy"


def _mock_imaging_data():
    data = np.load(_MOCK_IMAGING_PATH)  # Expected shape: [rows, columns, metabolites, images]
    if data.ndim != 4:
        raise BadRequest("Imaging data must be 4-dimensional")
    return data


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
    rows, cols, num_metabolites, num_images = _mock_imaging_data().shape
    return jsonify({
        "rows": rows,
        "columns": cols,
        "numMetabolites": num_metabolites,
        "numImages": num_images,
    }), 200


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
    return jsonify({"matrix": _mock_imaging_data().tolist()}), 200
