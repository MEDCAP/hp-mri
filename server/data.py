'''
mongoDB CRUD operation using application context of flask
'''
from flask import current_app
from bson import ObjectId

import app.external.python.mrd as mrd

def get_db(db_name="medcap_dev"):
    """
    Returns the MongoDB database instance from the current application context.
    """
    return current_app.mongo_client.get_database(db_name)

def list_all_mrdfiles(projection=None):
    """
    Retrieve list of mrd header from db sorted by study_date in descending order
    """
    db = get_db()
    sort_condition = {"study_date": -1,
                      "study_time": -1}
    return db.mrdfiles.find({}, projection).sort(sort_condition)

# def get_mrdfile_by_id(file_id):
#     """
#     Retrieves a single MRD file by its MongoDB ObjectId.
#     """
#     db = get_db()
#     return db.mrdfiles.find_one({"_id": ObjectId(file_id)})


# def delete_mrdfiles_by_ids(file_ids):
#     """
#     Deletes multiple MRD files based on a list of ObjectIds.
#     """
#     db = get_db()
#     # Convert string ids to ObjectId
#     object_ids = [ObjectId(id) for id in file_ids]
#     result = db.mrdfiles.delete_many({"_id": {"$in": object_ids}})
#     return result.deleted_count

def read_mrdfile_header(filepath):
    """
    Read the mrd file header to be encoded to databas
    """
    with mrd.BinaryMrdReader(filepath) as r:
        h = r.read_header()
        image_exist = False
        for item in r.read_data():
            if isinstance(item, mrd.StreamItem.ImageFloat):
                image_exist = True                
            pass

        header_for_db = {
            "study_date": h.study_information.study_date,
            "study_time": h.study_information.study_time,
            "subject_type": h.subject_information.patient_name,
            "protocol_name": h.measurement_information.protocol_name,
            "measurement_id": h.measurement_information.measurement_id,
            "image_exist": image_exist,
            "station_name": h.acquisition_system_information.station_name
        }
    return header_for_db

def insert_mrdfiles_header(header_data: dict) -> ObjectId:
    """
    Inserts a list of MRD file documents into the database.
    
    :param header_data: A list of dictionaries, where each dictionary 
                       represents an MRD file's metadata.
    :return: A list of ObjectId objects for the inserted documents.
    """
    db = get_db()
    if not header_data or not isinstance(header_data, list):
        return []
    result = db.mrdfiles.insert_many(files_data)
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
