import os
import boto3

class Config:
    # parse aws credentials from ~/.aws/credentials after aws-federated-login
    FLASK_APP='app.py'
    session = boto3.Session(profile_name='aws-medcap-psom-PennResearcher')
    AWS_ACCESS_KEY_ID = session.get_credentials().access_key
    AWS_SECRET_ACCESS_KEY = session.get_credentials().secret_key
    AWS_SESSION_TOKEN = session.get_credentials().token

class DevelopmentConfig(Config):
    DEBUG=True
    CORS_ORIGINS = ['http://localhost:5173']    # frontend serve dist folder

class ProductionConfig(Config):
    DEBUG=False
    CORS_ORIGINS = ["https://medcap.ai"]