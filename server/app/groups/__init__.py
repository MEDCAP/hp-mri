from flask import Blueprint

groups_bp = Blueprint("groups", __name__)

from . import routes

