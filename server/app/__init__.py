import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import DevelopmentConfig, ProductionConfig
from pymongo import MongoClient

def create_app():
    app = Flask(__name__)
    # default flask_env is development
    # overwrite to production in Dockerfile deployed on AWS ECS
    FLASK_ENV = os.getenv("FLASK_ENV", default="development")
    app.config.from_object(ProductionConfig if FLASK_ENV == "production" else DevelopmentConfig)
    # Initialize CORS to allow frontend localhost port 5173
    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
    # Create mongodb client using aws-federated login IAM role credentials
    app.mongo_client = MongoClient(app.config['MONGO_URI']) 
    # Register the mrds blueprint
    from app.mrds import mrds_bp
    app.register_blueprint(mrds_bp, url_prefix="/api")
    from app.viewer import viewer_bp
    app.register_blueprint(viewer_bp, url_prefix="/api")

    # Health check endpoint for AWS ALB
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "flask endpoint healthy"}), 200

    return app