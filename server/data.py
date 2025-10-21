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
from typing import Union, List, Optional
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
    DEPRECATED: Use list_mrdfiles_for_user instead for proper access control
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

def get_user_group_names(user_sub: str) -> List[str]:
    """
    Get list of group names that a user belongs to
    Always includes 'public' group for backwards compatibility
    """
    try:
        db = get_db()
        cursor = db.groups.find(
            {"members": user_sub},
            {"name": 1, "_id": 0}
        )
        user_groups = [doc["name"] for doc in cursor]
        
        # Always include 'public' group for backwards compatibility
        if "public" not in user_groups:
            user_groups.append("public")
            
        return user_groups
    except Exception as e:
        print(f"Error getting user groups: {e}")
        # Return at least public group even if there's an error
        return ["public"]

def list_mrdfiles_for_user(user_sub: str, projection=None, limit=50, skip=0):
    """
    Retrieve MRD files accessible to a user (private files + group files + public files)
    """
    try:
        db = get_db()
        
        # Get user's groups
        user_groups = get_user_group_names(user_sub)
        
        # Build query: user's private files OR files in user's groups OR legacy files (public)
        query = {
            "$or": [
                {"ownerId": user_sub},  # User's private files
                {"groupName": {"$in": user_groups}},  # Files in user's groups
                {"$and": [
                    {"$or": [{"ownerId": {"$exists": False}}, {"ownerId": None}]},  # No ownerId
                    {"$or": [{"groupName": {"$exists": False}}, {"groupName": None}]}  # No groupName
                ]}  # Legacy files (public to all)
            ]
        }
        
        sort_condition = {"studyDate": -1, "studyTime": -1}
        cursor = db.mrdfiles.find(query, projection).sort(sort_condition).skip(skip).limit(limit)
        
        cursor_list = list(cursor)
        for doc in cursor_list:
            doc['_id'] = str(doc['_id'])
        return cursor_list
    except Exception as e:
        print(f"Error listing mrd-files for user: {e}")
        return []
        
def get_mrdfile_by_id(file_id):
    """
    Retrieve mrdfile db entry by its ObjectId.
    DEPRECATED: Use get_mrdfile_by_id_with_auth instead for proper access control
    """
    db = get_db()
    return db.mrdfiles.find_one({"_id": ObjectId(file_id)})

def get_mrdfile_by_id_with_auth(file_id: str, user_sub: str):
    """
    Retrieve mrdfile db entry by its ObjectId with access control
    Returns file if user has access, None otherwise
    """
    try:
        db = get_db()
        file_doc = db.mrdfiles.find_one({"_id": ObjectId(file_id)})
        
        if not file_doc:
            return None
        
        # Check access: user owns file OR file is in user's group OR file is public (untagged)
        if file_doc.get("ownerId") == user_sub:
            return file_doc
        
        # Check if file is in user's groups
        user_groups = get_user_group_names(user_sub)
        if file_doc.get("groupName") in user_groups:
            return file_doc
        
        # Check if file is public (legacy files without both ownerId AND groupName)
        owner_id = file_doc.get("ownerId")
        group_name = file_doc.get("groupName")
        if ((owner_id is None or owner_id == "") and (group_name is None or group_name == "")):
            return file_doc
        
        return None
    except Exception as e:
        print(f"Error getting mrd file with auth: {e}")
        return None

def delete_mrdfiles_by_ids(file_ids):
    """
    Deletes multiple mrdfile db entries based on a list of ObjectIds.
    """
    db = get_db()
    # Convert string ids to ObjectId
    object_ids = [ObjectId(id) for id in file_ids]
    result = db.mrdfiles.delete_many({"_id": {"$in": object_ids}})
    return result.deleted_count

def read_mrdfile_header(filepath, owner_name=None):
    """
    Read the mrd file header as dict in mongodb mrd-files collection format
    
    :param filepath: Path to the MRD file
    :param owner_name: Optional owner name (e.g., from Cognito user), defaults to patient_name from MRD header
    """
    try:
        with mrd.BinaryMrdReader(filepath) as r:
            h = r.read_header()
            image_exist = False
            for item in r.read_data():
                if isinstance(item, (mrd.StreamItem.ImageFloat, mrd.StreamItem.ImageDouble)):
                    image_exist = True
                pass

            # Use provided owner_name or fallback to patient_name from MRD header
            effective_owner_name = owner_name if owner_name else h.subject_information.patient_name

            header_for_db = {
                "fileName": 'MID' + h.measurement_information.measurement_id + '-' + h.measurement_information.protocol_name,
                "studyDate": str(h.study_information.study_date) if h.study_information.study_date else "unknown",
                "studyTime": str(h.study_information.study_time) if h.study_information.study_time else "unknown",
                "ownerName": effective_owner_name,
                "subjectType": h.subject_information.patient_name,
                "groupName": None,  # Will be set by upload route
                "ownerId": None,    # Will be set by upload route
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
        # Use provided owner_name or "unknown" for failed parsing
        effective_owner_name = owner_name if owner_name else "unknown"
        basic_metadata = {
            "fileName": filename,
            "studyDate": "unknown",
            "studyTime": "unknown",
            "ownerName": effective_owner_name,
            "subjectType": "unknown",
            "groupName": None,  # Will be set by upload route
            "ownerId": None,    # Will be set by upload route
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
    -   Each iteration yields item.value.data as 5D image array (channels, slice, rows, cols, frequencies) and 
        item.value.head to specify metabolite label and measurement number
    @param file_id: file_id in mongodb of the mrd file
    @return
        - image_array: an image array of dimension (channel, slice, rows, cols, frequencies, measurements)
        - nmr_labels: list of label of frequencies converted from nparray of object. If frequencies dimension is 0, return an empty list
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
        for item in r.read_data():
            if isinstance(item, (mrd.StreamItem.ImageFloat, mrd.StreamItem.ImageDouble)):
                image = item.value
                # check if image.data has correct shape
                if image.data.ndim != 5:
                    raise ValueError(f"Invalid shape of image array: {image.data.shape}")
                # if rows and cols are 1, then image.data is spectrum
                if image.rows() == 1 or image.cols() == 1:
                    raise Exception("Spectrum is displayed")
                # fetch header information from the first image
                if image_array is None:
                    # image.data is 5D image array (channels, slice, rows, cols, frequencies)
                    image_array = image.data[..., np.newaxis]
                    image_array *= 255 / image.data.max()
                    meas_freq = image.head.measurement_freq
                    repetition = image.head.repetition
                    # append nmr_labels if it exists in MRD ImageHeader, otherwise return []
                    if image.head.measurement_freq_label is not None:
                        # image.head.measurement_freq_label is in nparray, need to convert to list
                        nmr_labels = image.head.measurement_freq_label.tolist()
                # if image_array is not None, there are image data to the existing image_array as 
                else:
                    # image_array is 6D image array (channels, slice, rows, cols, frequencies, measurements)
                    image_array = np.concatenate([image_array, image.data[..., np.newaxis]], axis=-1)

    # Check if any image data was found
    if image_array is None:
        raise ValueError(f"No image data found in MRD file with id: {file_id}")
    return image_array, nmr_labels

def get_pulse_array_from_mrdfile(file_id):
    """
    Extract pulse.data and pulse.phase from MRD file
    @param file_id: file_id in mongodb of the mrd file
    @return 
        - pulse_data: pulse data of float32 of 3D nparray(channels, samples, measurements)
        - pulse_phase: pulse phase of float32 of 2D nparray(samples, measurements)
        - start_time: pulse start time of float32 as list (measurements,)
        - dt: pulse sample time of float32 in ns as single value
    """
    # Setup AWS S3 client
    s3 = boto3.client("s3")
    # if current_app.config['S3_BUCKET']:
    #     BUCKET = current_app.config['S3_BUCKET']
    # else:
    BUCKET = 'medcap-data'
    s3_filekey = f'mrd_files/{file_id}'
    obj = s3.get_object(Bucket=BUCKET, Key=s3_filekey)

    body_bytes = obj['Body'].read()
    with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as r:
        h = r.read_header()
        pulse_data = None
        pulse_phase = None
        for item in r.read_data():
            if isinstance(item, mrd.StreamItem.Pulse):
                pulse = item.value
                if pulse_data is None:
                    start_time = [pulse.head.pulse_time_stamp_ns]
                    dt = pulse.head.sample_time_ns
                    pulse_data = pulse.amplitude[..., np.newaxis]  # float 3D (channels, samples, measurements)
                    pulse_phase = pulse.phase[..., np.newaxis]     # float 2D (samples, measurements)  
                else:
                    start_time.append(pulse.head.pulse_time_stamp_ns)
                    pulse_data = np.concatenate([pulse_data, pulse.amplitude[..., np.newaxis]], axis=-1)
                    pulse_phase = np.concatenate([pulse_phase, pulse.phase[..., np.newaxis]], axis=-1)
    # return pulse_data, pulse_phase, start_time, dt
    return pulse_data, pulse_phase

# Group management functions

def create_group(name: str, display_name: str, description: str, creator_sub: str) -> ObjectId:
    """
    Create a new group with the creator as admin and first member
    """
    try:
        db = get_db()
        group_doc = {
            "name": name,
            "displayName": display_name,
            "description": description,
            "createdAt": datetime.utcnow(),
            "createdBy": creator_sub,
            "members": [creator_sub],
            "admins": [creator_sub],
            "properties": {}
        }
        result = db.groups.insert_one(group_doc)
        return result.inserted_id
    except Exception as e:
        print(f"Error creating group: {e}")
        raise

def get_user_groups(user_sub: str) -> List[dict]:
    """
    Get all groups that a user belongs to with full details
    """
    try:
        db = get_db()
        cursor = db.groups.find({"members": user_sub})
        groups = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            groups.append(doc)
        return groups
    except Exception as e:
        print(f"Error getting user groups: {e}")
        return []

def get_group_by_name(group_name: str) -> Optional[dict]:
    """
    Get group details by name
    """
    try:
        db = get_db()
        group = db.groups.find_one({"name": group_name})
        if group:
            group['_id'] = str(group['_id'])
        return group
    except Exception as e:
        print(f"Error getting group: {e}")
        return None

def is_group_admin(group_name: str, user_sub: str) -> bool:
    """
    Check if user is admin of the group
    """
    try:
        db = get_db()
        group = db.groups.find_one(
            {"name": group_name, "admins": user_sub},
            {"_id": 1}
        )
        return group is not None
    except Exception as e:
        print(f"Error checking group admin: {e}")
        return False

def is_group_member(group_name: str, user_sub: str) -> bool:
    """
    Check if user is member of the group
    """
    try:
        db = get_db()
        group = db.groups.find_one(
            {"name": group_name, "members": user_sub},
            {"_id": 1}
        )
        return group is not None
    except Exception as e:
        print(f"Error checking group member: {e}")
        return False

def add_group_member(group_name: str, user_sub: str, added_by_sub: str) -> bool:
    """
    Add user to group. Any member can invite, but only admins can add without invitation
    """
    try:
        db = get_db()
        
        # Check if the person adding is a member
        if not is_group_member(group_name, added_by_sub):
            return False
        
        # Add member to group
        result = db.groups.update_one(
            {"name": group_name},
            {"$addToSet": {"members": user_sub}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error adding group member: {e}")
        return False

def remove_group_member(group_name: str, user_sub: str, removed_by_sub: str) -> bool:
    """
    Remove user from group. Only admins can remove members, or users can remove themselves
    """
    try:
        db = get_db()
        
        # Check if the person removing is admin or removing themselves
        if not (is_group_admin(group_name, removed_by_sub) or user_sub == removed_by_sub):
            return False
        
        # Don't allow removing the last admin
        group = get_group_by_name(group_name)
        if group and len(group.get("admins", [])) == 1 and user_sub in group.get("admins", []):
            return False
        
        # Remove from members and admins
        result = db.groups.update_one(
            {"name": group_name},
            {"$pull": {"members": user_sub, "admins": user_sub}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error removing group member: {e}")
        return False

def promote_to_admin(group_name: str, user_sub: str, promoted_by_sub: str) -> bool:
    """
    Promote user to admin. Only admins can promote
    """
    try:
        if not is_group_admin(group_name, promoted_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name, "members": user_sub},
            {"$addToSet": {"admins": user_sub}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error promoting to admin: {e}")
        return False

def demote_admin(group_name: str, user_sub: str, demoted_by_sub: str) -> bool:
    """
    Demote admin to regular member. Only admins can demote, can't demote yourself
    """
    try:
        if not is_group_admin(group_name, demoted_by_sub) or user_sub == demoted_by_sub:
            return False
        
        # Don't allow demoting the last admin
        group = get_group_by_name(group_name)
        if group and len(group.get("admins", [])) == 1:
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$pull": {"admins": user_sub}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error demoting admin: {e}")
        return False

def update_group_properties(group_name: str, updates: dict, updated_by_sub: str) -> bool:
    """
    Update group properties. Only admins can update
    """
    try:
        if not is_group_admin(group_name, updated_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$set": updates}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error updating group properties: {e}")
        return False

def delete_group(group_name: str, deleted_by_sub: str) -> bool:
    """
    Delete group. Only admins can delete, and group must be empty of files
    """
    try:
        if not is_group_admin(group_name, deleted_by_sub):
            return False
        
        # Check if group has any files
        db = get_db()
        file_count = db.mrdfiles.count_documents({"groupName": group_name})
        if file_count > 0:
            return False
        
        # Delete the group
        result = db.groups.delete_one({"name": group_name})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting group: {e}")
        return False

def change_file_visibility(file_id: str, new_group_name: Optional[str], user_sub: str) -> bool:
    """
    Change file from private to group or vice versa. Only file owner can change
    """
    try:
        db = get_db()
        
        # Check if user owns the file
        file_doc = db.mrdfiles.find_one({"_id": ObjectId(file_id)})
        if not file_doc or file_doc.get("ownerId") != user_sub:
            return False
        
        # If moving to a group, check if user is member of that group
        if new_group_name and not is_group_member(new_group_name, user_sub):
            return False
        
        # Update the file
        result = db.mrdfiles.update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {"groupName": new_group_name}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Error changing file visibility: {e}")
        return False
