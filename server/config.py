import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'
    S3_BUCKET = 'medcap-data'

class DevelopmentConfig(Config):
    DEBUG=True    
    # parse aws credentials from ~/.aws/credentials after aws-federated-login
    load_dotenv('.env.development')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')
    CORS_ORIGINS = ['http://localhost:5173']    # frontend serve dist folder
    MONGO_URI = f'mongodb+srv://{quote_plus(AWS_ACCESS_KEY_ID)}:{quote_plus(AWS_SECRET_ACCESS_KEY)}@mrd-files.gzajigq.mongodb.net/?authSource=%24external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&authMechanismProperties=AWS_SESSION_TOKEN:{quote_plus(AWS_SESSION_TOKEN)}&appName=mrd-files'

class ProductionConfig(Config):
    DEBUG=False
    # MONGO_URI for?
