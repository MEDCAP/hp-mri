from flask import Blueprint

# get the blueprint instance
mrds_bp = Blueprint('mrds', __name__)

from app.mrds import routes