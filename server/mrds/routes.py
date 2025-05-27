from flask import Flask, jsonify, request, send_file, Blueprint
from matplotlib import pyplot as plt
from scipy.io import loadmat
import os
import io
import matplotlib
import boto3

# Set the non-GUI backend before importing pyplot
matplotlib.use("Agg")

# Temporary mock data
# TODO: Replace with RDS Database for quick querying on file details
# TODO: When uploading actual file to S3 Bucket, add to this database
from data import db_mrd
from data import db_image
from data import db_simulator
from mrds import bp  # Import the Blueprint instance from __init__.py

# setup aws s3 client
s3 = boto3.client("s3")
BUCKET = "mrissim-app-user-content"

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

@bp.route("/plot-image", methods=["GET"])
def plot_image():
    try:
        # Load the proton image
        proton_matfile = "./mrds/test_image_matfiles/1115_first_measurement_dcm.mat"
        if not os.path.exists(proton_matfile):
            raise FileNotFoundError(f"File '{proton_matfile}' does not exist.")
        proton_image = loadmat(proton_matfile)["data"]

        # Load the carbon image
        carbon_matfile = "./mrds/test_image_matfiles/meas_MID01696_FID08543_c13_spspsp_BPAL_inj2_reconimage.mat"
        if not os.path.exists(carbon_matfile):
            raise FileNotFoundError(f"File '{carbon_matfile}' does not exist.")
        carbon_image = loadmat(carbon_matfile)["data"]
        carbon_image = carbon_image[1, :, :, 3, 1]  # show a specific slice

        # Plot the images using the Agg backend
        fig, ax = plt.subplots(1, 2, figsize=(10, 5))
        ax[0].imshow(proton_image, cmap="gray")
        ax[0].set_title("Proton Image of liver slice")
        ax[1].imshow(carbon_image, cmap="gray")
        ax[1].set_title("Carbon Image of heart slice")
        plt.tight_layout()

        # Save the plot to a BytesIO stream
        img_io = io.BytesIO()
        plt.savefig(img_io, format="png", bbox_inches="tight")
        img_io.seek(0)
        plt.close(fig)  # Ensure the figure is closed

        # Return the image as a response
        return send_file(img_io, mimetype="image/png")

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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


# Route to upload MRD file page
@bp.route("/upload", methods=["POST"])
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
            # upload to s3 as original name
            s3.upload_file(filepath, BUCKET, file.filename)
        except Exception as e:
            return jsonify({"aws access error": e}), 400
        # remove local file
        os.remove(filepath)
    return jsonify({"message": "files uploaded"}), 200


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


# Route to list Simulators
@bp.route("/simulator", methods=["GET"])
def show_simulator():
    filtered_simulator = [
        {
            "id": simulator["id"],
            "name": simulator["name"],
            "date": simulator["date"],
            "owner": simulator["owner"],
            "sequence": simulator["sequence"],
            "image": simulator["image"],
            "isSelected": simulator["isSelected"],
        }
        for simulator in db_simulator
    ]
    return jsonify(filtered_simulator)


@bp.route("/simluators", methods=["DELETE"])
def delete_simulator():
    global db_simulator
    simulator_ids = request.json.get("ids", [])
    if not simulator_ids:
        return jsonify({"error": "No simulator IDs provided"}), 400

    db_simulator = [
        simulator for simulator in db_simulator if simulator["id"] not in simulator_ids
    ]
    return jsonify({"message": "Simulator deleted successfully"}), 200
