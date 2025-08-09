'''
simulator routes
'''
from flask import jsonify, request

# Route to list Simulators
@mrds_bp.route("/simulator", methods=["GET"])
def show_simulator():
    filtered_simulator = [
        {
            "id": simulator["id"],
            "name": simulator["name"],
            "date": simulator["date"],
            "owner": simulator["owner"],
            "sequence": simulator["sequence"],
            "image": simulator["image"],
            "isSelected": simulator["isSelected"],
        }
        for simulator in db_simulator
    ]
    return jsonify(filtered_simulator)


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