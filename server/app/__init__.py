# application factory for dev and prod environments
import os
from flask import Flask
from config import DevelopmentConfig, ProductionConfig

def create_app():
    app = Flask(__name__)
    # overwrite FLASK_ENV to production in dockerfile
    FLASK_ENV = os.getenv("FLASK_ENV", default="development")
    app.config.from_object(ProductionConfig if FLASK_ENV == "production" else DevelopmentConfig)
    # Register the mrds blueprint
    from .mrds import mrds_bp
    app.register_blueprint(mrds_bp, url_prefix="/api")
    from visualization import visualization_bp
    app.register_blueprint(visualization_bp, url_prefix="/api")
    return app