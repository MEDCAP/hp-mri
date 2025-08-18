'''
mongoDB CRUD operation using application context of flask
'''
from flask import current_app
from bson import ObjectId
from datetime import datetime
import os
import boto3
import numpy as np
import matplotlib.pyplot as plt
from typing import Union
import io

import app.external.python.mrd as mrd

def get_db(db_name="medcap_dev"):
    """
    Returns the MongoDB database instance from the current application context.
    """
    try:
        client = current_app.mongo_client
        # Test the connection
        client.admin.command('ping')
        return client.get_database(db_name)
    except Exception as e:
        raise Exception(f"Failed to connect to MongoDB: {e}")

def list_all_mrdfiles(projection=None):
    """
    Retrieve list of mrd header from db sorted by studyDate in descending order
    """
    try:
        db = get_db()
        sort_condition = {"studyDate": -1,
                          "studyTime": -1}
        # cursor object cannot be re-iterated once excausted
        # convert to list to allow re-iteration
        cursor_list = list(db.mrdfiles.find({}, projection).sort(sort_condition))
        for doc in cursor_list:
            doc['_id'] = str(doc['_id'])
        return cursor_list
    except Exception as e:
        # Log the error for debugging purposes
        print(f"Error listing mrd-files from database: {e}")
        # Return an empty list to prevent frontend errors
        return []
        
def get_mrdfile_by_id(file_id):
    """
    Retrieve mrdfile db entry by its ObjectId.
    """
    db = get_db()
    return db.mrdfiles.find_one({"_id": ObjectId(file_id)})

def delete_mrdfiles_by_ids(file_ids):
    """
    Deletes multiple mrdfile db entries based on a list of ObjectIds.
    """
    db = get_db()
    # Convert string ids to ObjectId
    object_ids = [ObjectId(id) for id in file_ids]
    result = db.mrdfiles.delete_many({"_id": {"$in": object_ids}})
    return result.deleted_count

def read_mrdfile_header(filepath):
    """
    Read the mrd file header as dict in mongodb mrd-files collection format
    """
    try:
        body_bytes = obj['Body'].read()
        with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as r:
            h = r.read_header()
            image_exist = False
            for item in r.read_data():
                if isinstance(item, mrd.StreamItem.ImageFloat):
                    image_exist = True                
                pass

            header_for_db = {
                "fileName": h.measurement_information.measurement_id + '-' + h.measurement_information.protocol_name,
                "studyDate": str(h.study_information.study_date) if h.study_information.study_date else "unknown",
                "studyTime": str(h.study_information.study_time) if h.study_information.study_time else "unknown",
                "ownerName": h.subject_information.patient_name,
                "subjectType": h.subject_information.patient_name,
                "groupName": "public",
                "isReconstructed": image_exist,
                "protocolName": h.measurement_information.protocol_name,
                "measurementId": h.measurement_information.measurement_id,
                "stationName": h.acquisition_system_information.station_name,
                "original_filename": os.path.basename(filepath),
                "upload_timestamp": datetime.utcnow(),
                "file_size": os.path.getsize(filepath)
            }
        return header_for_db
    except Exception as e:
        print(f"MRD parsing failed for {filepath}: {str(e)}")
        # Create basic metadata for files that can't be parsed as MRD
        filename = os.path.basename(filepath)
        basic_metadata = {
            "fileName": filename,
            "studyDate": "unknown",
            "studyTime": "unknown",
            "ownerName": "unknown",
            "subjectType": "unknown",
            "groupName": "public",
            "isReconstructed": False,
            "protocolName": "unknown",
            "measurementId": os.path.splitext(filename)[0],
            "stationName": "unknown",
            "original_filename": filename,
            "upload_timestamp": datetime.utcnow(),
            "file_size": os.path.getsize(filepath),
            "parse_error": str(e)
        }
        return basic_metadata

def insert_mrdfile_header(header_data: dict) -> ObjectId:
    """
    Insert single MRD file document into mongodb
    
    :param header_data: dict where each dictionary 
                       represents an MRD file's metadata.
    :return: ObjectId of the inserted document.
    """
    # check if header_data is dict
    if not header_data or not isinstance(header_data, dict):
        raise ValueError("header_data must be a non-empty dictionary")
    
    db = get_db()
    # insert single mrd file header as single document 
    result = db.mrdfiles.insert_one(header_data)
    # return the object id of inserted mrd header document
    return result.inserted_id

def insert_mrdfiles_batch(header_data_list: list) -> list:
    """
    Insert multiple MRD file documents into mongodb
    
    :param header_data_list: list of dictionaries where each dictionary 
                            represents an MRD file's metadata.
    :return: List of ObjectId objects for the inserted documents.
    """
    if not header_data_list or not isinstance(header_data_list, list):
        return []
    
    db = get_db()
    # insert multiple mrd file headers as documents 
    result = db.mrdfiles.insert_many(header_data_list)
    # return the object ids of inserted mrd header documents
    return result.inserted_ids

def get_image_array_from_mrdfile(file_id):
    """
    Extracts 6D image array of dimension (channel, slice, rows, cols, frequencies, measurements) 
    and header from mrd file in S3 bucket
    -   MRDfile read_data is an iterable object, which you read by for loop one at a time
    -   Each iteration yields item.value.data as 4D image array (channels, slice, rows, cols, frequencies) and 
        item.value.head to specify metabolite label and measurement number
    @param file_id: file_id in mongodb of the mrd file
    @return
        - image_array: an image array of dimension (channel, slice, rows, cols, frequencies, measurements)
        - nmr_labels: list of label of metabolites. If metabolite dimension is 0, return []
    """
    # Setup AWS S3 client
    s3 = boto3.client("s3")
    # BUCKET = current_app.config['S3_BUCKET']
    BUCKET = 'medcap-data'
    s3_filekey = f'mrd_files/{file_id}'
    obj = s3.get_object(Bucket=BUCKET, Key=s3_filekey)
    
    # Initialize variables to avoid scope issues
    image_array = None
    nmr_labels = []

    body_bytes = obj['Body'].read()
    with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as r:
        h = r.read_header()
        counter = 0
        for item in r.read_data():
            if isinstance(item, Union[mrd.StreamItem.ImageFloat, mrd.StreamItem.ImageDouble]):
                image = item.value
                if counter == 0:
                    # 4D image array (channels, slice, rows, cols) to 6D image array (channels, slice, rows, cols, metabolites, measurements)
                    image_array = image.data[..., np.newaxis]
                    meas_freq = image.head.measurement_freq
                    repetition = image.head.repetition
                    # append nmr_labels if it exists in MRD ImageHeader, otherwise return []
                    if image.head.measurement_freq_label is not None:
                        # image.head.measurement_freq_label is in nparray, need to convert to list
                        nmr_labels = image.head.measurement_freq_label.tolist()
                    counter += 1
                else:
                    if image_array is not None:
                        image_array = np.concatenate([image_array, image.data[..., np.newaxis]], axis=-1)
    
    # Check if any image data was found
    if image_array is None:
        raise ValueError(f"No image data found in MRD file with id: {file_id}")
    return image_array, nmr_labels

def get_acquisition_array_from_mrdfile(file_id):
    """
    Extract acquisition array from MRD file
    @param file_id: file_id in mongodb of the mrd file
    @return 
        - acq_array: acquisition of complex float (readouts, channels, lines, slices, measurements, frequencies)
    """
    # Setup AWS S3 client
    s3 = boto3.client("s3")
    # BUCKET = current_app.config['S3_BUCKET']
    BUCKET = 'medcap-data'
    s3_filekey = f'mrd_files/{file_id}'
    obj = s3.get_object(Bucket=BUCKET, Key=s3_filekey)

    body_bytes = obj['Body'].read()
    with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as r:
        h = r.read_header()
        counter = 0
        for item in r.read_data():
            if isinstance(item, mrd.StreamItem.Acquisition):
                if counter == 0:
                    acq_array = item.value.data[..., np.newaxis]     # float 2D (channels, samples)
                    acq_phase = item.value.phase[..., np.newaxis]    # float 1D (samples)
                    print(item.value.phase.shape)
                else:
                    acq_array = np.concatenate([acq_array, item.value.data[..., np.newaxis]], axis=-1)
                    acq_phase = np.concatenate([acq_phase, item.value.phase[..., np.newaxis]], axis=-1)
        return acq_array, acq_phase

if __name__ == "__main__":
    # pig experiment data
    # file_id = '68a31686e69b077b4d68b9d9'
    # phantom data
    file_id = '68a301436b08cd8ee0dd41ed'
    image_array, nmr_labels = get_image_array_from_mrdfile(file_id)
    print(image_array.shape)
    plt.imshow(image_array[0,0,:,:,0,0])
    plt.show()