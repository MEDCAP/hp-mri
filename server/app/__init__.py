import logging
import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from config import DevelopmentConfig, ProductionConfig
from pymongo import MongoClient

from app.errors import register_error_handlers


_CONFIGS = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
}


def _configure_logging(app):
    """
    Send application logs to stdout so the ECS log driver collects them.

    Without this the only record of a failure was whatever a route chose to
    print, and most routes returned the exception text to the caller instead.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        "%(asctime)s %(levelname)s %(name)s: %(message)s"
    ))
    root = logging.getLogger()
    root.handlers = [handler]
    # Libraries stay at INFO even in development: pymongo alone logs every
    # topology heartbeat at DEBUG, which buries everything else.
    root.setLevel(logging.INFO)
    level = logging.DEBUG if app.config.get('DEBUG') else logging.INFO
    for name in ("app", "data", app.logger.name):
        logging.getLogger(name).setLevel(level)


def create_app():
    app = Flask(__name__)

    FLASK_ENV = os.getenv("FLASK_ENV", default="development")
    try:
        # An unrecognised value used to match neither branch, so no
        # configuration was loaded at all and the app died later on a bare
        # KeyError from the first config lookup.
        app.config.from_object(_CONFIGS[FLASK_ENV])
    except KeyError:
        raise RuntimeError(
            f"FLASK_ENV={FLASK_ENV!r} is not one of {sorted(_CONFIGS)}"
        ) from None

    # Initialised in every environment. It used to be set up only in the
    # development branch, and ProductionConfig defined no origins, so production
    # ran with no CORS middleware at all. Invisible while CloudFront keeps the
    # SPA and API same-origin; fatal the moment the API moves to its own host.
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    _configure_logging(app)
    register_error_handlers(app)

    app.mongo_client = MongoClient(app.config['MONGO_URI'])
    # Register the mrds blueprint
    from app.mrds import mrds_bp
    app.register_blueprint(mrds_bp, url_prefix="/api")
    from app.viewer import viewer_bp
    app.register_blueprint(viewer_bp, url_prefix="/api")
    from app.groups import groups_bp
    app.register_blueprint(groups_bp, url_prefix="/api")

    # Health check endpoint for AWS ALB
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "flask endpoint healthy",
                        "mode": FLASK_ENV}), 200

    return app
