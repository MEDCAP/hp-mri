from dotenv import load_dotenv
from pymongo import MongoClient
import os
from config import DevelopmentConfig

# load_dotenv('.env.database')
MONGO_URI = DevelopmentConfig.MONGO_URI

client = MongoClient(host=MONGO_URI)
db = client.get_database("medcap_dev")
mrdfiles = db.get_collection("mrdfiles")

print(list(mrdfiles.find({})))

client.close()
