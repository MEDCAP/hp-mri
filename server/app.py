from flask import Flask
from flask_cors import CORS

# def create_app():
#     # Initialize Flask application
#     app = Flask(__name__)

#     # Configure CORS for production
#     # Replace 'http://localhost:5173' with your production frontend domain
#     CORS(app, resources={r"/*": 
#         {"origins": ["http://localhost:5173", "https://medcap.ai"]}})
#     # Import blueprints inside the factory to avoid circular imports
#     from mrds.routes import bp as mrds_bp
#     from visualize.visualization import bp as visualization_bp

#     # Register blueprints
#     app.register_blueprint(mrds_bp, url_prefix="/api")
#     app.register_blueprint(visualization_bp, url_prefix="/visualize-api")

#     return app

# # Create application instance
# app = create_app()


# keep this file as simple as possible
from flask import Flask, jsonify, request
from flask_cors import CORS
from mrds.routes import bp as mrds_bp  # Import the blueprint from routes.py
from visualize.visualization import bp as visualization_bp

app = Flask(__name__)

# Allow CORS for requests from frontend dev server
CORS(app, resources={r"/*": 
{"origins": ["http://localhost:5173", 
             "https://medcap.ai"]}})

# Register the mrds blueprint
app.register_blueprint(mrds_bp, url_prefix="/api")
app.register_blueprint(visualization_bp, url_prefix="/visualize-api")

# Start the server
if __name__ == "__main__":
    app.run(debug=True, port=5000)
