"""
Module: mr_solutions_processing.py

Description:
This module contains functions for processing HP MRI data from MR Solutions magnets, handling specific data formats and configurations. It includes utilities for reading and processing both proton images and complex EPSI data.

Functions:
- get_num_slider_values(): Calculate the number of slider values based on the available DICOM images.
- count_datasets(): Counts the number of dataset folders within a specified EPSI folder.
- process_proton_picture(slider_value, data): Retrieves and processes proton images based on slider inputs.
- process_hpmri_data(epsi_value, threshold): Processes and filters HP MRI data using a dynamic threshold.
- read_mrd_file(epsi_value): Reads MRD file data specific to MR Solutions format.

Author:
Benjamin Yoon

Date:
2024

Version:
1.2.2
"""

# Import statements
import numpy as np
from flask import jsonify, send_file
import os
import traceback
from PIL import Image
import cv2
import pydicom
import io
from pathlib import Path

# Constants
DICOM_FOLDER = "/Users/zhouzih/Documents/Programming/MEDCAP/data/data MRS/proton/1/"
DATASET_FOLDER = Path(
    "/Users/zhouzih/Documents/Programming/MEDCAP/data/data MRS/epsi/"
)
DATASET = [
    folder
    for folder in os.listdir(DATASET_FOLDER)
    if os.path.isdir(DATASET_FOLDER / folder)
]


class MRSSolutionsDataProcessor:
    """
    A class to handle data reading and processing specific to MR Solutions MRI equipment.

    Attributes:
        samples (int): Number of samples in the dataset.
        views (int): Number of views in the dataset.
        slice_views (int): Number of slice views in the dataset.
        slices (int): Number of slices in the dataset.
        echoes (int): Number of echoes in the dataset.
        nex (int): Number of experiments in the dataset.
    """

    def __init__(self):
        """
        Initializes the data processor with default values for its parameters.
        """
        self.samples = 0
        self.views = 0
        self.slice_views = 0
        self.slices = 0
        self.echoes = 0
        self.nex = 0

    def read_mrd_file(self, epsi_index):
        """
        Reads an MRD file from a specified dataset index and extracts relevant MRI data.

        Args:
            epsi_index (int): Index of the dataset folder from which to read the MRD file.

        """
        folder_path = DATASET_FOLDER / DATASET[epsi_index]
        files = [f for f in os.listdir(folder_path) if f.endswith(".MRD")]
        if not files:
            raise FileNotFoundError(f"No MRD file found in directory: {folder_path}")

        with open(folder_path / files[0], "rb") as fd:
            fdbytes = fd.read()
            self.samples = np.frombuffer(fdbytes[0:4], dtype="int32")[0]
            self.views = np.frombuffer(fdbytes[4:8], dtype="int32")[0]
            self.slice_views = np.frombuffer(fdbytes[8:12], dtype="int32")[0]
            self.slices = np.frombuffer(fdbytes[12:16], dtype="int32")[0]
            self.type = np.frombuffer(fdbytes[18:20], dtype="int16")[0]
            self.echoes = np.frombuffer(fdbytes[152:156], dtype="int32")[0]
            self.nex = np.frombuffer(fdbytes[156:160], dtype="int32")[0]

            total_points = (
                self.samples
                * self.views
                * self.slice_views
                * self.slices
                * self.echoes
                * self.nex
            )
            data_start = 512
            data_type_map = {
                3: ("int16", 2),
                16: ("uint8", 2),
                17: ("int8", 2),
                18: ("int16", 4),
                19: ("int16", 4),
                20: ("int32", 8),
                21: ("float32", 8),
                22: ("float64", 16),
            }

            dtype, multiplier = data_type_map.get(self.type, (None, None))
            if not dtype:
                print("Unknown data format")
                return

            data_end = data_start + total_points * multiplier
            data = np.frombuffer(fdbytes[data_start:data_end], dtype=dtype)

            if self.type in (16, 17, 18, 19, 20, 21, 22):
                data = data[::2] + 1j * data[1::2]  # Combining real and imaginary parts

            self.raw_data = np.reshape(
                data,
                (
                    self.samples,
                    self.views,
                    self.slice_views,
                    self.slices,
                    self.echoes,
                    self.nex,
                ),
                order="F",
            )
            self.parameters = fdbytes[
                data_end:
            ]  # Parameters are appended at the end of the file as a text description


def get_num_slider_values():
    """
    Retrieves the number of available slider values by counting DICOM files in a directory.

    Returns:
        int: Total number of slider values available.
    """
    dicom_files = [file for file in os.listdir(DICOM_FOLDER) if file.endswith(".dcm")]
    return len(dicom_files)


def count_datasets():
    """
    Counts the number of dataset folders available in the EPSI dataset directory.

    Returns:
        int: Number of dataset folders found.
    """
    dataset_count = 0

    for entry in os.listdir(DATASET_FOLDER):
        dataset_count += 1

    return dataset_count


def process_proton_picture(slider_value, data):
    """
    Processes a proton image using the specified slider value and additional data parameters.

    Args:
        slider_value (int): The index to determine which image to load.
        data (dict): Additional data necessary for processing the image, such as contrast settings.

    Returns:
        Flask Response: Either the image file as PNG or an error message in JSON format.
    """
    try:
        filename = f"5091_{slider_value:05d}.dcm"
        dicom_path = os.path.join(DICOM_FOLDER, filename)
        if not os.path.exists(dicom_path):
            return jsonify({"error": "DICOM file not found"}), 404
        # Image processing logic
        dcm = pydicom.dcmread(dicom_path)
        slice_image = dcm.pixel_array
        slice_image[slice_image < 5] = 0

        normalized_image = (slice_image - np.min(slice_image)) / (
            np.max(slice_image) - np.min(slice_image)
        )
        normalized_image[normalized_image < 0.05] = 0.0

        contrast = data.get("contrast", 1)
        clahe = cv2.createCLAHE(clipLimit=contrast, tileGridSize=(8, 8))
        clahe_image = clahe.apply(np.uint8(normalized_image * 255))
        clahe_image[clahe_image < 5] = 0
        rescaled_image = clahe_image / 255.0
        rescaled_image[rescaled_image < 0.05] = 0.0

        buffer = io.BytesIO()
        pil_image = Image.fromarray((rescaled_image * 255).astype(np.uint8))
        pil_image.save(buffer, format="PNG")
        buffer.seek(0)

        return send_file(buffer, mimetype="image/png")
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def process_hpmri_data(epsi_value, threshold):
    """
    Processes HP MRI data for the specified EPSI dataset index using a dynamic threshold.

    Args:
        epsi_value (int): Index of the EPSI dataset to process.
        threshold (float): Threshold value to apply for data filtering.

    """
    mrs_solutions_data_processor = MRSSolutionsDataProcessor()
    mrs_solutions_data_processor.read_mrd_file(epsi_value)
    # Apply threshold and additional data processing here
