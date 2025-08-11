import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import DevelopmentConfig, ProductionConfig
from pymongo import MongoClient

def create_app():
    app = Flask(__name__)
    # default flask_env is development
    FLASK_ENV = os.getenv("FLASK_ENV", default="development")
    if FLASK_ENV == "development":
        app.config.from_object(DevelopmentConfig)
        # Initialize CORS to allow frontend localhost port 5173
        CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
        # Create mongodb client using aws-federated login IAM role credentials
        # if app.config.get('AWS_ACCESS_KEY_ID') and app.config.get('AWS_SECRET_ACCESS_KEY') and app.config.get('AWS_SESSION_TOKEN'):
        #     # Set AWS credentials as environment variables for MongoDB AWS auth
        #     os.environ['AWS_ACCESS_KEY_ID'] = app.config['AWS_ACCESS_KEY_ID']
        #     os.environ['AWS_SECRET_ACCESS_KEY'] = app.config['AWS_SECRET_ACCESS_KEY']
        #     os.environ['AWS_SESSION_TOKEN'] = app.config['AWS_SESSION_TOKEN']
    elif FLASK_ENV == "production":
        app.config.from_object(ProductionConfig)

    app.mongo_client = MongoClient(app.config['MONGO_URI']) 
    # Register the mrds blueprint
    from app.mrds import mrds_bp
    app.register_blueprint(mrds_bp, url_prefix="/api")
    from app.viewer import viewer_bp
    app.register_blueprint(viewer_bp, url_prefix="/api")

    # Health check endpoint for AWS ALB
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "flask endpoint healthy",
                        "mode": FLASK_ENV,
                        "MONGO_URI": app.config['MONGO_URI']}), 200

    return app