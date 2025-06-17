import os

class Config:
    # parse aws credentials from ~/.aws/credentials after aws-federated-login
    FLASK_APP='app.py'
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_SESSION_TOKEN = os.environ.get('AWS_SESSION_TOKEN')

class DevelopmentConfig(Config):
    DEBUG=True
    CORS_ORIGINS = ['http://localhost:5173']    # frontend serve dist folder

class ProductionConfig(Config):
    DEBUG=False
    CORS_ORIGINS = ["https://medcap.ai"]