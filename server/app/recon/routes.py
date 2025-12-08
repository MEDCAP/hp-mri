'''
Reconstruct MRS data
'''
from flask import jsonify, request


# Route to list Simulators
@mrds_bp.route("/recon", methods=["POST"])
def reconstruct_epsi():
    '''
    Reconstruct EPI data
    '''
    pass


@mrds_bp.route("/simluators", methods=["DELETE"])
def delete_simulator():
    global db_simulator
    simulator_ids = request.json.get("ids", [])
    if not simulator_ids:
        return jsonify({"error": "No simulator IDs provided"}), 400

    db_simulator = [
        simulator for simulator in db_simulator if simulator["id"] not in simulator_ids
    ]
    return jsonify({"message": "Simulator deleted successfully"}), 200