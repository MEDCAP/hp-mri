import os
from flask import Flask
from flask_cors import CORS

from mrds.routes import bp as mrds_bp  # Import the blueprint from routes.py
from visualize.visualization import bp as visualization_bp
from config import DevelopmentConfig, ProductionConfig

def create_app():
    app = Flask(__name__)
    if os.environ.get("FLASK_ENV") == "production":
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    # Allow CORS for requests from frontend dev server
    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})

    # Register the mrds blueprint
    app.register_blueprint(mrds_bp, url_prefix="/api")
    app.register_blueprint(visualization_bp, url_prefix="/api")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config["DEBUG"], port=5000)