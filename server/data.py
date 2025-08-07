'''
mongoDB CRUD operation using application context of flask
'''
from flask import current_app
from bson import ObjectId
from datetime import datetime
import os

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
        print(f"MongoDB connection error: {e}")
        raise Exception(f"Failed to connect to MongoDB: {e}")

def list_all_mrdfiles(projection=None):
    """
    Retrieve list of mrd header from db sorted by studyDate in descending order
    """
    try:
        db = get_db()
        sort_condition = {"studyDate": -1,
                          "studyTime": -1}
        return db.mrdfiles.find({}, projection).sort(sort_condition)
    except Exception as e:
        print(f"Error in list_all_mrdfiles: {e}")
        # Return empty list instead of cursor
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
        with mrd.BinaryMrdReader(filepath) as r:
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


# mockdata
# db_mrd = [
#     {
#         "id": 1,
#         "name": "Sequence 1",
#         "date": "2024-11-6",
#         "owner": "MEDCAP",
#         "reconImagesCount": 12,
#         "isSelected": False,
#         "parameter": "Add Parameter Info",
#         "raw": {
#             "description": "Raw data description",
#             "scanned_time": "2024-11-06T12:30:00",
#             "institution": "MEDCAP Institute",
#             "machine_vendor": "Siemens",
#         },
#         "image": True,
#         "aux": True,
#         "reconstructed": False,
#     },
#     {
#         "id": 2,
#         "name": "Sequence 2",
#         "date": "2024-11-5",
#         "owner": "Ben Yoon",
#         "reconImagesCount": 8,
#         "isSelected": False,
#         "parameter": "Add Parameter Info",
#         "raw": {
#             "description": "Raw data description",
#             "scanned_time": "2024-11-05T13:30:00",
#             "institution": "Ben Yoon Clinic",
#             "machine_vendor": "GE Healthcare",
#         },
#         "image": True,
#         "aux": True,
#         "reconstructed": False,
#     },
#     {
#         "id": 3,
#         "name": "Sequence 3",
#         "date": "2024-10-16",
#         "owner": "Kento",
#         "reconImagesCount": 15,
#         "isSelected": False,
#         "parameter": "Add Parameter Info",
#         "raw": {
#             "description": "Raw data description",
#             "scanned_time": "2024-11-05T13:30:00",
#             "institution": "Clinic",
#             "machine_vendor": "GE Healthcare",
#         },
#         "image": False,
#         "aux": False,
#         "reconstructed": True,
#     },
#     {
#         "id": 4,
#         "name": "Sequence 4",
#         "date": "2024-10-16",
#         "owner": "Zihao",
#         "reconImagesCount": 15,
#         "isSelected": False,
#         "parameter": "Add Parameter Info",
#         "raw": {
#             "description": "Raw data description",
#             "scanned_time": "2024-11-05T13:30:00",
#             "institution": "Clinic",
#             "machine_vendor": "GE Healthcare",
#         },
#         "image": True,
#         "aux": False,
#         "reconstructed": False,
#     },
#     {
#         "id": 5,
#         "name": "Sequence 5",
#         "date": "2024-10-17",
#         "owner": "Steve",
#         "reconImagesCount": 15,
#         "isSelected": False,
#         "parameter": "Add Parameter Info",
#         "raw": {
#             "description": "Raw data description",
#             "scanned_time": "2024-11-05T13:30:00",
#             "institution": "Clinic",
#             "machine_vendor": "GE Healthcare",
#         },
#         "image": False,
#         "aux": True,
#         "reconstructed": False,
#     },
#     {
#         "id": 6,
#         "name": "Sequence 6",
#         "date": "2024-11-25",
#         "owner": "Ben Yoon",
#         "reconImagesCount": 15,
#         "isSelected": False,
#         "parameter": "Add Parameter Info",
#         "raw": {
#             "description": "Raw data description",
#             "scanned_time": "2024-11-25T14:30:00",
#             "institution": "MEDCAP Institute",
#             "machine_vendor": "Siemens",
#         },
#         "image": True,
#         "aux": True,
#         "reconstructed": True,
#     },
# ]

# db_image = [
#     {
#         "id": 1,
#         "name": "Image 1",
#         "date": "2024-11-6",
#         "owner": "MEDCAP",
#         "sequence_id": 1,
#         "sequence": "Sequence 1",
#         "isSelected": False,
#     },
#     {
#         "id": 2,
#         "name": "Image 2",
#         "date": "2024-11-5",
#         "owner": "Ben Yoon",
#         "sequence_id": 2,
#         "sequence": "Sequence 2",
#         "isSelected": False,
#     },
#     {
#         "id": 3,
#         "name": "Image 3",
#         "date": "2024-10-16",
#         "owner": "Kento",
#         "sequence_id": 3,
#         "sequence": "Sequence 3",
#         "isSelected": False,
#     },
#     {
#         "id": 4,
#         "name": "Image 4",
#         "date": "2024-10-16",
#         "owner": "Zihao",
#         "sequence_id": 4,
#         "sequence": "Sequence 4",
#         "isSelected": False,
#     },
#     {
#         "id": 5,
#         "name": "Image 5",
#         "date": "2024-10-17",
#         "owner": "Steve",
#         "sequence_id": 5,
#         "sequence": "Sequence 5",
#         "isSelected": False,
#     },
#     {
#         "id": 6,
#         "name": "Image 1",
#         "date": "2024-11-25",
#         "owner": "Ben Yoon",
#         "sequence_id": 6,
#         "sequence": "Sequence 6",
#         "isSelected": False,
#     },
#     {
#         "id": 7,
#         "name": "Image 2",
#         "date": "2024-11-25",
#         "owner": "Ben Yoon",
#         "sequence_id": 6,
#         "sequence": "Sequence 6",
#         "isSelected": False,
#     },
#     {
#         "id": 8,
#         "name": "Image 3",
#         "date": "2024-11-25",
#         "owner": "Ben Yoon",
#         "sequence_id": 6,
#         "sequence": "Sequence 6",
#         "isSelected": False,
#     },
#     {
#         "id": 9,
#         "name": "Image 4",
#         "date": "2024-11-25",
#         "owner": "Ben Yoon",
#         "sequence_id": 6,
#         "sequence": "Sequence 6",
#         "isSelected": False,
#     },
# ]

# db_simulator = [
#     {
#         "id": 1,
#         "name": "Simulator 1",
#         "date": "2024-10-18",
#         "owner": "MEDCAP",
#         "sequence": "Sequence 1",
#         "image": "Image 1",
#         "isSelected": False,
#     },
#     {
#         "id": 2,
#         "name": "Simulator 2",
#         "date": "2024-10-17",
#         "owner": "Ben Yoon",
#         "sequence": "Sequence 2",
#         "image": "Image 2",
#         "isSelected": False,
#     },
#     {
#         "id": 3,
#         "name": "Simulator 3",
#         "date": "2024-10-16",
#         "owner": "Kento",
#         "sequence": "Sequence 3",
#         "image": "Image 3",
#         "isSelected": False,
#     },
#     {
#         "id": 4,
#         "name": "Simulator 4",
#         "date": "2024-10-15",
#         "owner": "Zihao",
#         "sequence": "Sequence 4",
#         "image": "Image 4",
#         "isSelected": False,
#     },
# ]