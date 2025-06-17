from flask import Blueprint

viewer_bp = Blueprint("viewer", __name__)

from . import routes