import os
from dotenv import load_dotenv

class Config:
    # parse aws credentials from ~/.aws/credentials after aws-federated-login
    FLASK_APP='run.py'

class DevelopmentConfig(Config):
    DEBUG=True
    load_dotenv('.env.development')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')
    CORS_ORIGINS = ['http://localhost:5173']    # frontend serve dist folder

class ProductionConfig(Config):
    DEBUG=False