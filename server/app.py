# keep this file as simple as possible
from flask import Flask, jsonify, request
from flask_cors import CORS
from mrds.routes import bp as mrds_bp  # Import the blueprint from routes.py

app = Flask(__name__)

# Allow CORS for requests from 'http://localhost:5173' (frontend)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Register the mrds blueprint
app.register_blueprint(mrds_bp, url_prefix="/api")

# Start the server
if __name__ == "__main__":
    app.run(debug=True, port=5000)
