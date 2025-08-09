from flask import Blueprint

simulator_bp = Blueprint("simulator", __name__)

from . import routes