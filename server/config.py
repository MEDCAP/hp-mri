import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'
    S3_BUCKET = os.getenv('S3_BUCKET', 'medcap-data')

    # Database inside the Atlas cluster. Historically this was hardcoded as a
    # default argument in data.get_db(), which is why production also runs
    # against a database named "medcap_dev".
    MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'medcap_dev')

    # Uploads go browser -> S3 directly via a presigned PUT, so the API only ever
    # receives small JSON bodies. This is a DoS guard, not an upload size limit.
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024

    # Presigned uploads land here first; a bucket lifecycle rule expires the prefix
    # after a day so abandoned uploads clean themselves up.
    UPLOAD_STAGING_PREFIX = 'uploads/staging/'

    # Ceiling on a single MRD file. Checked at init against the client-declared size
    # and again at complete against the real object size.
    MAX_UPLOAD_BYTES = int(os.getenv('MAX_UPLOAD_BYTES', 2 * 1024 * 1024 * 1024))

    # Lifetime of a presigned PUT URL. Note that when signing with temporary
    # federated credentials (see DevelopmentConfig) the URL dies with the session
    # token, whichever comes first.
    PRESIGN_EXPIRY_SECONDS = int(os.getenv('PRESIGN_EXPIRY_SECONDS', 3600))

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