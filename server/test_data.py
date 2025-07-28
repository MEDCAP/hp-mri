from dotenv import load_dotenv
from pymongo import MongoClient
import os
import json
from bson import json_util  # For properly handling MongoDB's ObjectId

load_dotenv('.env.database')
MONGO_URI = os.getenv('MONGO_URI')

client = MongoClient(MONGO_URI)
db = client.get_database("medcap_dev")
mrdfiles = db.get_collection("mrdfiles")

# Method 1: Convert cursor to list and print all documents
# documents = list(mrdfiles.find({}))
# result = json.dumps(documents, default=json_util.default, indent=2)
print(list(mrdfiles.find()))
for doc in mrdfiles.find():
    print(doc['_id'])
    print(doc['file_name'])

client.close()