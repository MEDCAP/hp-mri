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

def get_image_array_from_mrdfile(file_id):
    """
    Read the mrd file image as numpy array
    :param filepath: local path to the mrd file
    """
    # Setup AWS S3 client
    s3 = boto3.client("s3")
    BUCKET = current_app.config['S3_BUCKET']
    s3_filekey = f'mrd_files/{file-id}'
    obj = s3.get_object(Bucket=BUCKET, Key=s3_filekey)
    with mrd.BinaryMrdReader(obj['Body']) as r:
        h = r.read_header()
        for item in r.read_data():
            if isinstance(item, mrd.StreamItem.ImageFloat):
                image_array = item.value
                image_array *= 255 / image_array.max()
        return image_array.astype(np.uint8) # channel, slice, x, y