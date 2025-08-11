import sys
import os

# Add the 'server' directory to the Python path to resolve imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import current_app
from app import create_app

def test_read_from_mongodb():
    """
    Initializes a Flask app, creates an application context, and uses
    current_app.mongo_client to fetch data from the 'mrdfiles' collection
    in the 'medcap_dev' database.
    """
    app = create_app()
    with app.app_context():
        # current_app is now available because we are inside an app context.
        print("Successfully created Flask application context.")
        
        try:
            client = current_app.mongo_client
            db = client.get_database('medcap_dev')
            collection = db.mrdfiles

            print(f"Attempting to find documents in '{collection.name}' collection of '{db.name}' database...")
            
            # .find() returns a cursor. Let's fetch a few documents to test.
            documents = collection.find().limit(5)
            
            doc_list = list(documents)

            if doc_list:
                print(f"Successfully found {len(doc_list)} document(s):")
                for doc in doc_list:
                    # Convert ObjectId to str for printing
                    doc['_id'] = str(doc['_id'])
                    print(doc)
            else:
                print("No documents found in the collection.")
        
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    test_read_from_mongodb()