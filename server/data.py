'''
mongoDB CRUD operation using application context of flask
'''
from dotenv import load_dotenv
from pymongo import MongoClient
import os
import json
from bson import json_util  # For properly handling MongoDB's ObjectId

load_dotenv('.env.database')
MONGO_URI = str | None = os.getenv('MONGO_URI') or getattr()

client = MongoClient(MONGO_URI)
db = client.get_database("medcap_dev")
collection = db.get_collection("mrdfiles")

db_mrd_files = list(collection.find({}))
client.close()

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

