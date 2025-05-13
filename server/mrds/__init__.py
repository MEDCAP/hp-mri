from flask import Blueprint

bp = Blueprint('mrds', __name__)

# Import routes to register them with the blueprint
from mrds import routes