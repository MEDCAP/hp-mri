import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV')
    DEBUG = False
    CORS_ORIGINS = ["http://localhost:5173"]    # frontend dev server

class DevelopmentConfig(Config):
    DEBUG = True
    CORS_ORIGINS = ["http://localhost:5173"]

class ProductionConfig(Config):
    DEBUG = False
    CORS_ORIGINS = ["https://medcap.ai"]

