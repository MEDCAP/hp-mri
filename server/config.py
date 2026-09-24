"""
Application configuration.

NOTE: these are class attributes, so every os.getenv below runs once, when this
module is first imported. The environment must be set before the process
starts -- which is how ECS and docker run both work -- and changing a variable
at runtime has no effect.
"""
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'
    S3_BUCKET = os.getenv('S3_BUCKET', 'medcap-data')

    # Database inside the Atlas cluster. Previously a hardcoded default argument
    # on data.get_db().
    #
    # The default stays "medcap_dev" -- which is PRODUCTION's database, despite
    # the name -- because the live task definition sets no environment
    # variables at all. Defaulting to anything else would point production at
    # an empty database the moment this deploys. Once the Terraform task
    # definition sets MONGO_DB_NAME explicitly and the rename to hpmri_prod is
    # done (terraform/README.md), flip this default to "hpmri_dev" so an
    # unconfigured local run lands somewhere harmless.
    MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'medcap_dev')

    # Comma-separated in the environment; a list in the app. Defined on the base
    # class so ProductionConfig cannot silently lack it, which is how the
    # production deployment ended up with no CORS middleware at all.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv('CORS_ORIGINS', '').split(',')
        if origin.strip()
    ]

class DevelopmentConfig(Config):
    DEBUG=True
    # parse environment variables
    if os.path.exists('.env.development'):
        load_dotenv('.env.development')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    AWS_SESSION_TOKEN = os.getenv('AWS_SESSION_TOKEN')
    CORS_ORIGINS = Config.CORS_ORIGINS or [
        'http://localhost:5173',    # frontend localhost
        'http://localhost:3000',    # compiled vite dist folder
    ]

    # Build MongoDB URI using AWS credentials for authentication
    if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN:
        MONGO_URI = f'mongodb+srv://{quote_plus(AWS_ACCESS_KEY_ID)}:{quote_plus(AWS_SECRET_ACCESS_KEY)}@mrd-files.gzajigq.mongodb.net/?authSource=%24external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&authMechanismProperties=AWS_SESSION_TOKEN:{quote_plus(AWS_SESSION_TOKEN)}&appName=mrd-files'
    # use MONGO_URI variable saved in env file
    else:
        MONGO_URI = os.getenv('MONGO_URI')

class ProductionConfig(Config):
    DEBUG=False
    # Env override first, so the Terraform task definition can inject it from
    # SSM. Falls back to the cluster the live deployment has always used.
    MONGO_URI = os.getenv(
        'MONGO_URI',
        'mongodb+srv://mrd-files.gzajigq.mongodb.net/?authSource=$external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&appName=mrd-files',
    )
