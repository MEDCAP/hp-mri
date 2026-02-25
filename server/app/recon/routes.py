'''
Reconstruct MRS data

EPSI
- upload a folder to s3 bucket
- converter tyger to aggregate data
-   

- Upload a folder to S3 bucket
- converter tyger
    - spectrum data to convert from single MRS data
- tyger buffer write from s3 bucket
- reconstruct and return data to tyger buffer read
- buffer cp to s3 bucket

'''
from flask import jsonify, request
from app.recon import recon_bp

# Route to list Simulators
@recon_bp.route("/recon", methods=["POST"])
def reconstruct_epsi():
    '''
    Reconstruct EPI data
    '''
    pass


@recon_bp.route("/simluators", methods=["DELETE"])
def delete_simulator():
    global db_simulator
    simulator_ids = request.json.get("ids", [])
    if not simulator_ids:
        return jsonify({"error": "No simulator IDs provided"}), 400

    db_simulator = [
        simulator for simulator in db_simulator if simulator["id"] not in simulator_ids
    ]
    return jsonify({"message": "Simulator deleted successfully"}), 200