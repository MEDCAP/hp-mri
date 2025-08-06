import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'
    S3_BUCKET = 'medcap-data'

class DevelopmentConfig(Config):
    DEBUG=True    
    # parse environment variables
    load_dotenv('.env.development')
    AWS_ACCESS_KEY_ID = os.getenv('aws_access_key_id')
    AWS_SECRET_ACCESS_KEY = os.getenv('aws_secret_access_key')
    AWS_SESSION_TOKEN = os.getenv('aws_session_token')
    CORS_ORIGINS = ['http://localhost:5173']    # frontend serve dist folder
    
    # Build MongoDB URI using AWS credentials for authentication
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN:
        MONGO_URI = f'mongodb+srv://{quote_plus(AWS_ACCESS_KEY_ID)}:{quote_plus(AWS_SECRET_ACCESS_KEY)}@mrd-files.gzajigq.mongodb.net/?authSource=%24external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&authMechanismProperties=AWS_SESSION_TOKEN:{quote_plus(AWS_SESSION_TOKEN)}&appName=mrd-files'
    else:
        # Fallback to direct URI if AWS credentials are not available
        MONGO_URI = os.getenv('MONGO_URI')

class ProductionConfig(Config):
    DEBUG=False
