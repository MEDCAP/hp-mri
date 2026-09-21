"""
Application configuration.

NOTE: these are class attributes, so every os.getenv below runs once, when this
module is first imported. The environment must therefore be set before the
process starts -- which is how ECS and docker run both work, but it does mean
changing a variable at runtime has no effect, and that anything reloading
config must reload this module.
"""
import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

class Config:
    FLASK_APP='run.py'
    S3_BUCKET = os.getenv('S3_BUCKET', 'medcap-data')

    # Database inside the Atlas cluster.
    #
    # The default is the DEVELOPMENT database on purpose. It was once hardcoded
    # as a default argument in data.get_db(), pointing at production -- so
    # running the app locally with nothing configured wrote to live research
    # data. Deployed environments set this explicitly in their task definition;
    # anyone omitting it should land somewhere harmless.
    MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'hpmri_dev')

    # Uploads go browser -> S3 directly via a presigned PUT, so the API only ever
    # receives small JSON bodies. This is a DoS guard, not an upload size limit.
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024

    # Presigned uploads land here first; a bucket lifecycle rule expires the prefix
    # after a day so abandoned uploads clean themselves up.
    UPLOAD_STAGING_PREFIX = 'uploads/staging/'

    # Ceiling on a single MRD file. Checked at init against the client-declared size
    # and again at complete against the real object size.
    MAX_UPLOAD_BYTES = int(os.getenv('MAX_UPLOAD_BYTES', 2 * 1024 * 1024 * 1024))

    # Comma-separated in the environment; a list in the app. Defined on the
    # base class so ProductionConfig cannot silently lack it, which is how the
    # production deployment ended up with no CORS middleware at all.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv('CORS_ORIGINS', '').split(',')
        if origin.strip()
    ]

    # --- authentication ---------------------------------------------------
    # The API has no authentication today: Cognito is client-side only and the
    # backend never validates a token, so every endpoint is open. app/auth.py
    # implements validation; this flag gates enforcement so the frontend can
    # start sending tokens before the door is locked. See app/auth.py for the
    # rollout order.
    REQUIRE_AUTH = os.getenv('REQUIRE_AUTH', 'false').lower() == 'true'
    COGNITO_REGION = os.getenv('COGNITO_REGION', 'us-east-1')
    COGNITO_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID', 'us-east-1_vUo50ofKI')
    COGNITO_CLIENT_ID = os.getenv('COGNITO_CLIENT_ID', '4nvgf7et9f4ui0glr4ddf152r8')

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
    MONGO_URI = 'mongodb+srv://mrd-files.gzajigq.mongodb.net/?authSource=$external&authMechanism=MONGODB-AWS&retryWrites=true&w=majority&appName=mrd-files'