from flask import jsonify, request, current_app
import os
import boto3
from bson import json_util, ObjectId
import json
from werkzeug.utils import secure_filename
from datetime import datetime

# list, insert mongodb functions
from data import list_all_mrdfiles, insert_mrdfile_header, read_mrdfile_header
# read mrd header function
from data import get_mrdfile_by_id

# flask blueprint for mrds route
from . import mrds_bp

# Route to list MRD files
@mrds_bp.route("/mrd-files", methods=["GET"])
def show_files():
    """
    Return a list of MRD files with selected fields from MongoDB
    """
    try:
        # define projection to list only relevant fields for display
        proj = {
            "fileName": 1,
            "studyDate": 1,
            "studyTime": 1,
            "ownerName": 1,
            "subjectType": 1,
            "groupName": 1,
            "isReconstructed": 1,
            "protocolName": 1,
            "measurementId": 1,
            "stationName": 1,
            "original_filename": 1,
            "upload_timestamp": 1,
            "file_size": 1,
            "s3_key": 1,
            "_id": 1
        }
        # list of cursor object 
        cursor_list = list_all_mrdfiles(projection=proj)
        return jsonify(cursor_list)
    except Exception as e:
        return jsonify({"error": "Invalid query of mrdfiles database", "details": str(e)}), 400

# Route to retrieve specific file details
@mrds_bp.route("/mrd-files/<file_id>", methods=["GET"])
def get_file_details(file_id):
    try:
        file_data = get_mrdfile_by_id(file_id)
        if file_data:
            # json_util handles BSON types like ObjectId
            return json.loads(json_util.dumps(file_data)), 200
        return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": "Invalid file ID", "details": str(e)}), 400

# Route to upload MRD files
@mrds_bp.route("/upload", methods=["POST"])
def upload_file():
    """
    Handle batch upload of MRD files with proper error handling and status tracking
    """
    if "file" not in request.files:
        return jsonify({"error": "No files selected"}), 400
    
    # Get the current user name from form data (sent from frontend)
    if "ownerName" not in request.form:
        return jsonify({"error": "current UserName not found"}), 400
    current_user_name = request.form.get("ownerName")
    
    # Setup AWS S3 client
    s3 = boto3.client("s3")
    BUCKET = current_app.config['S3_BUCKET']
    
    # Create temporary directory for file processing
    upload_path = os.path.join(os.path.dirname(os.path.realpath(__file__)), "tmpdata")
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    
    files = request.files.getlist("file")
    results = []
    successful_files = 0
    failed_files = 0
    
    # Process each file
    for file in files:
        if file.filename == '':
            continue
            
        # Validate file extension
        allowed_extensions = {'.bin', '.mrd', '.mrd2'}
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            results.append({
                "original_filename": file.filename,
                "status": "error",
                "error": f"File type {file_ext} not allowed. Supported: {', '.join(allowed_extensions)}"
            })
            failed_files += 1
            continue
        
        # Save file to temporary location
        temp_filepath = os.path.join(upload_path, secure_filename(file.filename))
        file.save(temp_filepath)
        
        try:
            import time
            
            # Step 1: Extract metadata from MRD file (20% of progress)
            time.sleep(0.3)  # Simulate metadata extraction time
            db_entry = read_mrdfile_header(temp_filepath, owner_name=current_user_name)
            # Step 2: Insert metadata into MongoDB (40% of progress)
            time.sleep(0.2)  # Simulate database operation
            inserted_id = insert_mrdfile_header(db_entry)
            
            # Step 3: Upload to S3 with MongoDB ObjectId as filename (80% of progress)
            # Simulate upload time based on file size (longer for larger files)
            file_size_mb = os.path.getsize(temp_filepath) / (1024 * 1024)
            upload_time = min(1.0, max(0.3, file_size_mb * 0.2))  # 0.3-1.0 seconds based on file size
            time.sleep(upload_time)
            s3_key = f"mrd_files/{str(inserted_id)}"
            s3.upload_file(temp_filepath, BUCKET, s3_key)
            
            # Step 4: Update database with S3 key (100% of progress)
            time.sleep(0.1)  # Simulate final database update
            from data import get_db
            db = get_db()
            db.mrdfiles.update_one(
                {"_id": inserted_id},
                {"$set": {"s3_key": s3_key}}
            )
            
            # Convert metadata to JSON-serializable format
            serializable_metadata = {}
            for key, value in db_entry.items():
                if hasattr(value, '__str__'):
                    serializable_metadata[key] = str(value)
                else:
                    serializable_metadata[key] = value
            
            # Success result
            results.append({
                "original_filename": file.filename,
                "status": "completed",
                "metadata": serializable_metadata,
                "db_id": str(inserted_id),
                "s3_key": s3_key
            })
            successful_files += 1
            
        except Exception as e:
            # Error result
            results.append({
                "original_filename": file.filename,
                "status": "error",
                "error": str(e)
            })
            failed_files += 1
            
        finally:
            # Always cleanup temporary file
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
    
    # Prepare response
    response_data = {
        "message": f"Processed {len(results)} files",
        "total_files": len(results),
        "successful_files": successful_files,
        "failed_files": failed_files,
        "results": results,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Return appropriate status code based on results
    if failed_files > 0 and successful_files > 0:
        return jsonify(response_data), 207  # 207 Multi-Status for partial success
    elif failed_files > 0:
        return jsonify(response_data), 400  # 400 Bad Request if all files failed
    else:
        return jsonify(response_data), 200  # 200 OK if all files succeeded

@mrds_bp.route("/mrd-file", methods=["DELETE"])
def delete_files():
    try:
        file_ids = request.json.get("ids", [])
        if not file_ids:
            return jsonify({"error": "No file IDs provided"}), 400

        # Setup AWS S3 client
        s3 = boto3.client("s3")
        BUCKET = current_app.config['S3_BUCKET']
        
        # Get database connection
        from data import get_db, delete_mrdfiles_by_ids
        db = get_db()
        
        deleted_count = 0
        s3_deleted_count = 0
        file_results = []
        
        for file_id in file_ids:
            try:
                # First, get the file document to find the S3 key
                file_doc = db.mrdfiles.find_one({"_id": ObjectId(file_id)})
                
                if file_doc:
                    file_result = {
                        "file_id": file_id,
                        "file_name": file_doc.get('fileName', 'Unknown'),
                        "status": "success",
                        "db_deleted": False,
                        "s3_deleted": False,
                        "error": None
                    }
                    
                    # Delete from S3 if s3_key exists
                    if 's3_key' in file_doc:
                        try:
                            s3.delete_object(Bucket=BUCKET, Key=file_doc['s3_key'])
                            s3_deleted_count += 1
                            file_result["s3_deleted"] = True
                        except Exception as s3_error:
                            error_msg = f"Error deleting from S3: {str(s3_error)}"
                            print(f"Error deleting from S3 for file {file_id}: {s3_error}")
                            file_result["status"] = "error"
                            file_result["error"] = error_msg
                    
                    # Delete from MongoDB
                    try:
                        result = db.mrdfiles.delete_one({"_id": ObjectId(file_id)})
                        if result.deleted_count > 0:
                            deleted_count += 1
                            file_result["db_deleted"] = True
                    except Exception as db_error:
                        error_msg = f"Error deleting from database: {str(db_error)}"
                        print(f"Error deleting from database for file {file_id}: {db_error}")
                        file_result["status"] = "error"
                        file_result["error"] = error_msg
                        
                    file_results.append(file_result)
                else:
                    file_results.append({
                        "file_id": file_id,
                        "file_name": "Unknown",
                        "status": "error",
                        "db_deleted": False,
                        "s3_deleted": False,
                        "error": "File not found in database"
                    })
                        
            except Exception as file_error:
                print(f"Error processing file {file_id}: {file_error}")
                file_results.append({
                    "file_id": file_id,
                    "file_name": "Unknown",
                    "status": "error",
                    "db_deleted": False,
                    "s3_deleted": False,
                    "error": str(file_error)
                })
                continue
        
        return jsonify({
            "message": f"Successfully deleted {deleted_count} files from database and {s3_deleted_count} files from S3",
            "deleted_count": deleted_count,
            "s3_deleted_count": s3_deleted_count,
            "file_results": file_results
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete files", "details": str(e)}), 400

@mrds_bp.route("/mrd-file/<int:file_id>/download")
def download_file(file_id):
    # download file
    pass
