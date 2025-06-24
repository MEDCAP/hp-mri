import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import DevelopmentConfig, ProductionConfig

def create_app():
    app = Flask(__name__)
    # overwrite FLASK_ENV to production in dockerfile
    FLASK_ENV = os.getenv("FLASK_ENV", default="development")
    app.config.from_object(ProductionConfig if FLASK_ENV == "production" else DevelopmentConfig)
    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})
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