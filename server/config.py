import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'
    S3_BUCKET = 'medcap-data'

class DevelopmentConfig(Config):
    DEBUG=True    
    # parse environment variables
    if os.path.exists('.env.development'):
        load_dotenv('.env.development')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')
    CORS_ORIGINS = ['http://localhost:5173',    # frontend localhost
                    'http://localhost:3000']    # compiled vite dist folder
                    
    # Build MongoDB URI using AWS credentials for authentication
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN:
        MONGO_URI = f'mongodb+srv://{quote_plus(AWS_ACCESS_KEY_ID)}:{quote_plus(AWS_SECRET_ACCESS_KEY)}@mrd-files.gzajigq.mongodb.net/?authSource=%24external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&authMechanismProperties=AWS_SESSION_TOKEN:{quote_plus(AWS_SESSION_TOKEN)}&appName=mrd-files'
    # use MONGO_URI variable saved in env file 
    else:
        MONGO_URI = os.getenv('MONGO_URI')

class ProductionConfig(Config):
    DEBUG=False
    MONGO_URI = 'mongodb+srv://mrd-files.gzajigq.mongodb.net/?authSource=$external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&appName=mrd-files'