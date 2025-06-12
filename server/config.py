import os
from dotenv import load_dotenv

# Load environment variables
env = os.getenv('FLASK_ENV', 'development')
load_dotenv(f'.env.{env}')

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = False
    TESTING = False
    CORS_ORIGINS = ['http://localhost:3000']  # Default to frontend dev server

class DevelopmentConfig(Config):
    DEBUG = True
    CORS_ORIGINS = ['http://localhost:3000']
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///dev.db')

class ProductionConfig(Config):
    CORS_ORIGINS = [os.getenv('FRONTEND_URL', 'https://your-production-frontend.com')]
    DATABASE_URL = os.getenv('DATABASE_URL')
    SECRET_KEY = os.getenv('SECRET_KEY') 