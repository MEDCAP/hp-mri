import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'

class DevelopmentConfig(Config):
    DEBUG=True    
    # parse aws credentials from ~/.aws/credentials after aws-federated-login
    load_dotenv('.env.development')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')
    CORS_ORIGINS = ['http://localhost:5173']    # frontend serve dist folder
    # mongodb connection with aws-federated login IAM role credentials
    MONGO_URI = 'mongodb+srv://mrd-files.gzajigq.mongodb.net/?authSource=%24external&authMechanism=MONGODB-AWS'
class ProductionConfig(Config):
    DEBUG=False
    # MONGO_URI?
    MONGO_URI = 'mongodb+srv://mrd-files.gzajigq.mongodb.net/?authSource=%24external&authMechanism=MONGODB-AWS'