from flask import Blueprint

bp = Blueprint('mrd', __name__)

from mrds import routes