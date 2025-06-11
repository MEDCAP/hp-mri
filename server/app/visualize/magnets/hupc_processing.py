import os
import struct
import traceback
import numpy as np
from flask import jsonify, send_file
from PIL import Image
# import cv2
import pydicom
from scipy.fft import fftn
import io
import boto3

local = False  # set to true to test files stored locally
if local:
    # Constants
    DICOM_FOLDER = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project4 HP MRI Web Application/hp-mri-web-application-yoonbenjamin/data/s_2023041103/fsems_rat_liver_03.dmc/"
    EPSI_FOLDER = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project4 HP MRI Web Application/hp-mri-web-application-yoonbenjamin/data/s_2023041103/epsi_16x12_13c_"
    DATASET_FOLDER = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project4 HP MRI Web Application/hp-mri-web-application-yoonbenjamin/data/s_2023041103/"
    FID_FOLDER = "/Users/benjaminyoon/Desktop/PIGI folder/Projects/Project4 HP MRI Web Application/hp-mri-web-application-yoonbenjamin/data/s_2023041103/fsems_rat_liver_03"
else:
    s3 = boto3.client("s3")
    BUCKET_NAME = "medcap-data"
    DICOM_FOLDER = "MRS/s_2023041103/fsems_rat_liver_05.dmc/"
    EPSI_FOLDER = "MRS/s_2023041103/epsi_16x12_13c_"
    DATASET_FOLDER = "MRS/s_2023041103/"
    FID_FOLDER = "MRS/s_2023041103/fsems_rat_liver_05"
EPSI_INFO = {"pictures_to_read_write": 1, "proton": 60, "centric": 1}
PATH_EPSI = ""
SCALE = True
ROWS = 12
COLUMNS = 16
MOVING_AVERAGE_WINDOW = 1


def get_num_slider_values():
    """
    Calculate the number of slider values based on available datasets or images.

    Returns:
        int: The total number of slider values (datasets or images).
    """
    if local:
        dicom_files = [file for file in os.listdir(DICOM_FOLDER) if file.endswith(".dcm")]
    else:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=DICOM_FOLDER)
        dicom_files = [obj['Key'] for obj in response.get('Contents', []) if obj['Key'].endswith('.dcm')]
    num_slider_values = len(dicom_files)
    return num_slider_values


def count_datasets():
    """
    Counts the number of dataset folders within a specified EPSI folder.
    Folder names follow the format: 'epsi_16x12_13c_xx.fid', where 'xx' is the folder number.

    Returns:
    int: Number of dataset folders.
    """
    if local:
        # Initialize the count of datasets
        dataset_count = 0
        # List all entries in the directory given by 'epsi_folder'
        for entry in os.listdir(DATASET_FOLDER):
            # Check if the entry is a directory and matches the expected pattern
            if (
                os.path.isdir(os.path.join(DATASET_FOLDER, entry))
                and entry.startswith("epsi_16x12_13c_")
                and entry.endswith(".fid")
            ):
                dataset_count += 1
    else:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=DATASET_FOLDER, Delimiter="/") 
        epsi_folders = [obj['Prefix'] for obj in response.get('CommonPrefixes', [])]
        dataset_count = len([fid for fid in epsi_folders 
                             if fid.startswith("epsi_16x12_13c_") and fid.endswith(".fid/")])
    return dataset_count

def process_proton_picture(slider_value: int, data):
    """
    Retrieves an image based on the slider value from DICOM files, applying contrast adjustment and returning a PNG.

    Args:
        slider_value (int): The index to determine which image to load.
        data (dict): Additional data necessary for processing the image, such as contrast settings or other parameters.

    Returns:
        Flask Response: Image file as PNG or an error message in JSON format.
    """
    try:
        filename = f"slice{slider_value:03d}image001echo001.dcm"
        dicom_path = os.path.join(DICOM_FOLDER, filename)
        if local:
            if not os.path.exists(dicom_path):
                return jsonify({"error": "DICOM file not found"}), 404
            dcm = pydicom.dcmread(dicom_path)
        else:
            s3.download_file(BUCKET_NAME, dicom_path, filename)
            dcm = pydicom.dcmread(filename)
            os.remove(filename)
        slice_image = dcm.pixel_array
        slice_image[slice_image < 5] = 0

        normalized_image = (slice_image - np.min(slice_image)) / (
            np.max(slice_image) - np.min(slice_image)
        )
        normalized_image[normalized_image < 0.05] = 0.0

        # temporary remove cv2 to avoid docker install error
        # contrast = data.get("contrast", 1)
        # clahe = cv2.createCLAHE(clipLimit=contrast, tileGridSize=(8, 8))
        # clahe_image = clahe.apply(np.uint8(normalized_image * 255))
        # clahe_image[clahe_image < 5] = 0
        # rescaled_image = clahe_image / 255.0
        # rescaled_image[rescaled_image < 0.05] = 0.0
        # pil_image = Image.fromarray((rescaled_image * 255).astype(np.uint8))
        pil_image = Image.fromarray((normalized_image * 255).astype(np.uint8))
        buffer = io.BytesIO()
        pil_image.save(buffer, format="PNG")
        buffer.seek(0)

        return send_file(buffer, mimetype="image/png")
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def process_hp_mri_data(epsi_value, threshold):
    """
    Retrieves and processes EPSI data based on given parameters, returning sanitized data for visualization.

    Args:
        epsi_value (int): EPSI slider value to fetch the corresponding data.
        threshold (float): Threshold value for filtering the data.

    Returns:
        json: Sanitized EPSI data or error message in JSON format.
    """
    try:
        global lro_fid, lpe_fid, lro_epsi, lpe_epsi, x_epsi, epsi, spectral_data, plot_shift
        read_epsi_plot(epsi_value, threshold)

        epsi_sanitized = np.nan_to_num(epsi, nan=-1).tolist()
        spectral_data_sanitized = np.nan_to_num(spectral_data, nan=-1).tolist()
        plot_shift = [-0.3, -0.4]

        data_to_send = {
            "xValues": x_epsi.tolist(),
            "data": epsi_sanitized,
            "columns": COLUMNS,
            "spectralData": spectral_data_sanitized,
            "rows": ROWS,
            "longitudinalScale": lro_fid,
            "perpendicularScale": lpe_fid,
            "longitudinalMeasurement": lro_epsi,
            "perpendicularMeasurement": lpe_epsi,
            "plotShift": plot_shift,
        }
        return jsonify(data_to_send)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


def read_epsi_plot(epsi_value, threshold):
    """
    Processes EPSI data based on the configuration and value provided, filtering out low-intensity data.

    Args:
        epsi_value (int): The EPSI value used to determine which data slice to process.
        threshold (float): Intensity threshold for filtering data.

    Modifies:
        Updates global variables for spectral data and EPSI display parameters.
    """
    global lro_fid, lpe_fid, lro_epsi, lpe_epsi, x_epsi, epsi, spectral_data
    proton_quarter = EPSI_INFO["proton"] / 4
    path_epsi = f"{EPSI_FOLDER}{epsi_value:02d}"
    spectral_data = read_write_spectral_data(EPSI_INFO, path_epsi, proton_quarter)
    spectral_data = np.flip(np.flip(spectral_data, 0), 1)

    if SCALE:
        maximum_spectral_data_value = np.max(spectral_data)
        spectral_data /= maximum_spectral_data_value
    else:
        maximum_spectral_data_value = np.max(spectral_data, axis=2)
        spectral_data /= maximum_spectral_data_value

    epsi = []
    for i in range(ROWS):
        row_information = []
        for j in range(COLUMNS):
            if np.max(spectral_data[i, j, :]) < threshold:
                spectral_data[i, j, :] = np.nan
            row_information = np.concatenate(
                (
                    np.squeeze(row_information),
                    np.squeeze(np.roll(spectral_data[i, j, :], 0)),
                )
            )
        epsi = np.concatenate(
            (np.squeeze(epsi), np.squeeze(row_information + ROWS - i))
        )

    x_epsi = np.tile(np.arange(0, spectral_data.shape[2] * COLUMNS), ROWS)
    for nan_rows in range(0, ROWS - 1):
        epsi[nan_rows * spectral_data.shape[2] * COLUMNS] = np.nan
    epsi = (
        np.convolve(epsi, np.ones(MOVING_AVERAGE_WINDOW), mode="same")
        / MOVING_AVERAGE_WINDOW
    )
    epsi[~np.isnan(epsi)] -= 1

    # Update subplot positioning
    lro_fid = read_write_procpar("lro", FID_FOLDER)[0] * 10
    lpe_fid = read_write_procpar("lpe 1", FID_FOLDER)[0] * 10
    lro_epsi = read_write_procpar("lro", path_epsi)[0] * 10
    lpe_epsi = read_write_procpar("lpe 1", path_epsi)[0] * 10


def read_write_spectral_data(epsi_tmp, file_path, proton_quarter):
    """
    Reads and processes spectral data from the specified file.

    :param epsi: A dictionary containing configuration parameters for data processing.
    :param file_path: The path to the directory containing the spectral data files.
    :param proton_quarter: The proton quarter value used in data processing.
    :return: Processed spectral data as a complex numpy array.
    :rtype: ndarray

    Author: Benjamin Yoon
    Date: 2023-11-03
    Version: 1.0.0
    """
    global lro_fid, lpe_fid, lro_epsi, lpe_epsi, x_epsi, epsi, spectral_data
    ne = read_write_procpar("ne", file_path)
    ne = ne[0]
    number_of_points = read_write_procpar("np", file_path)
    number_of_points = number_of_points[0] // 2
    nv = read_write_procpar("nv 1", file_path)
    nv = nv[0]
    te = read_write_procpar("te2", file_path)
    et = 1 / te[0]

    # Arrange echoes
    if epsi_tmp["centric"]:
        echoes = np.array([0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6]) + 7
    else:
        echoes = np.arange(1, nv + 1)
    tmp_spectral_data_array = np.zeros(
        (int(nv), int(number_of_points), int(ne), epsi_tmp["pictures_to_read_write"]),
        dtype=complex,
    )
    tmp_spectral_data_array_1 = tmp_spectral_data_array.copy()
    tmp_spectral_data_array_2 = tmp_spectral_data_array.copy()
    tmp_spectral_data_array_3 = np.zeros(
        (
            int(nv),
            int(number_of_points),
            int(2 * ne),
            epsi_tmp["pictures_to_read_write"],
        ),
        dtype=complex,
    )
    spectral_data = tmp_spectral_data_array_3.copy()
    tmp_spectral_data = spectral_data.copy()
    for i in range(epsi_tmp["pictures_to_read_write"]):
        real_information, imaginary_information, _, _, _, _ = read_write_fid(file_path)
        for j in range(int(ne)):
            ix = np.arange(j, int(nv * ne), int(ne))
            tmp_spectral_data_array[:, :, j, i] = (
                real_information[:, ix] - 1j * imaginary_information[:, ix]
            ).T
        for j in range(int(nv)):
            tmp_spectral_data_array_1[echoes[j] - 1, :, :, :] = tmp_spectral_data_array[
                j, :, :, :
            ]
        for j in range(int(nv)):
            for k in range(int(number_of_points)):
                line = np.squeeze(tmp_spectral_data_array_1[j, k, :, i])
                tmp_spectral_data_array_2[j, k, :, i] = line * np.exp(
                    -np.arange(0, int(ne)).T * proton_quarter / et
                )
        tmp_spectral_data_array_3[:, :, 0 : int(ne), i] = tmp_spectral_data_array_2[
            :, :, 0 : int(ne), i
        ]
        tmp_spectral_data_1 = np.fft.fftshift(
            fftn(np.squeeze(tmp_spectral_data_array_3[:, :, :, i]))
        )
        tmp_spectral_data_2 = tmp_spectral_data_1.copy()
        for j in range(0, int(nv)):
            for k in range(0, int(number_of_points)):
                tmp_spectral_data[j, k, :, i] = tmp_spectral_data_2[
                    j, int(number_of_points - k - 1), ::-1
                ]
    spectral_data = np.abs(tmp_spectral_data)
    epsi = epsi_tmp
    return spectral_data


# Method to read specific lines from a 'procpar' file
def read_write_procpar(read_line, file_path):
    """
    Reads specific lines from the 'procpar' file located at 'file_path'.

    :param read_line: The parameter name to be read from 'procpar'.
    :param file_path: The path to the directory containing the 'procpar' file.
    :return: A list of values associated with the given parameter name.
    :rtype: list of float

    Author: Benjamin Yoon
    Date: 2023-11-03
    Version: 1.0.0
    """
    global lro_fid, lpe_fid, lro_epsi, lpe_epsi, x_epsi, epsi, spectral_data
    file_path += ".fid"
    file_path += "/procpar"
    if local:
        with open(file_path) as g:
            read_lines = g.readlines()
    else:
        # procpar file is read as txt file
        response = s3.get_object(Bucket=BUCKET_NAME, Key=file_path)
        read_lines = response["Body"].readlines()
        read_lines = [line.decode("utf-8") for line in read_lines]  # decode bytes to str
    for i, line in enumerate(read_lines):
        if line.strip().startswith(read_line):
            line_read = read_lines[i + 1].strip()
            return [float(val) for val in line_read.split()[1:]]


# Method to read data from a 'fid' file
def read_write_fid(file_path):
    """
    Reads and processes data from the 'fid' file.

    :param file_path: The path to the 'fid' file.
    :return: A tuple containing various data elements.
    :rtype: tuple

    Author: Benjamin Yoon
    Date: 2023-11-03
    Version: 1.0.0
    """
    global lro_fid, lpe_fid, lro_epsi, lpe_epsi, x_epsi, epsi, spectral_data
    path = f"{file_path}.fid/fid"
    if local:
        with open(path, "rb") as f:
            fid = f
    else:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=path)
        fid = response['Body']
    blocks = struct.unpack(">i", fid.read(4))[0]
    traces = struct.unpack(">i", fid.read(4))[0]
    points = struct.unpack(">i", fid.read(4))[0]
    eb = struct.unpack(">i", fid.read(4))[0]
    tb = struct.unpack(">i", fid.read(4))[0]
    bb = struct.unpack(">i", fid.read(4))[0]
    vi = struct.unpack(">h", fid.read(2))[0]
    s = struct.unpack(">h", fid.read(2))[0]
    number_of_headers = struct.unpack(">i", fid.read(4))[0]
    s32 = int(bool(s & 4))
    sf = int(bool(s & 8))
    real_information = []
    imaginary_information = []
    b = list(range(1, blocks + 1))
    ob = len(b)
    t = list(range(1, traces + 1))
    ot = len(t)
    i = 1
    j = 1
    for k in range(1, blocks + 1):
        # Read a block header
        scale = struct.unpack(">h", fid.read(2))[0]
        bs = struct.unpack(">h", fid.read(2))[0]
        index = struct.unpack(">h", fid.read(2))[0]
        m = struct.unpack(">h", fid.read(2))[0]
        cc = struct.unpack(">i", fid.read(4))[0]
        lv = struct.unpack(">f", fid.read(4))[0]
        rv = struct.unpack(">f", fid.read(4))[0]
        lvl = struct.unpack(">f", fid.read(4))[0]
        tl = struct.unpack(">f", fid.read(4))[0]
        a = 1
        kk = 0
        for c in range(1, traces + 1):
            # Read data for each trace
            if sf == 1:
                d = struct.unpack(f">{points}f", fid.read(points * 4))
            elif s32 == 1:
                d = struct.unpack(f">{points}i", fid.read(points * 4))
            else:
                d = struct.unpack(f">{points}h", fid.read(points * 2))

            # Keep the data if it matches the desired blocks and traces
            if b[j - 1] == k:
                if a <= ot:
                    if t[a - 1] == c:
                        real_information.append(list(d[::2]))
                        imaginary_information.append(list(d[1::2]))
                        i += 1
                        a += 1
                        kk = 1
        if kk:
            j += 1
        if j > ob:
            break
    real_information = np.array(real_information).T
    imaginary_information = np.array(imaginary_information).T
    number_of_points = points // 2
    number_of_blocks = blocks
    number_of_traces = traces
    header_information = [
        blocks,
        traces,
        points,
        eb,
        tb,
        bb,
        vi,
        s,
        number_of_headers,
        scale,
        bs,
        index,
        m,
        cc,
        lv,
        rv,
        lvl,
        tl,
    ]
    return (
        real_information,
        imaginary_information,
        number_of_points,
        number_of_blocks,
        number_of_traces,
        header_information,
    )