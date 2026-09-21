"""
Reading pipeline jobs.

Nothing here starts one: a job belongs to the blueprint that knows what the work
is, which calls service.start_job. These two routes are how the frontend polls
what it started.
"""
from bson import ObjectId
from flask import jsonify, request

from app.auth import require_auth
from app.errors import BadRequest, NotFound
from app.jobs import jobs_bp
from app.jobs.service import STATUSES, public_job

from data import get_db

# The frontend polls the collection while a run is in flight, so this is a page
# size rather than a way to read history.
_LIST_LIMIT = 50


@jobs_bp.route("/jobs/<job_id>", methods=["GET"])
@require_auth
def get_job(job_id):
    job = get_db().jobs.find_one({"_id": ObjectId(job_id)})
    if job is None:
        raise NotFound("Job not found.")
    return jsonify(public_job(job))


@jobs_bp.route("/jobs", methods=["GET"])
@require_auth
def list_jobs():
    query = {}

    file_id = request.args.get("fileId")
    if file_id:
        query["input_file_id"] = file_id

    status = request.args.get("status")
    if status:
        if status not in STATUSES:
            raise BadRequest(f"{status!r} is not a job status.")
        # Matches the stored status. An abandoned run is still stored as
        # `running` and is reported failed only once public_job has seen it.
        query["status"] = status

    cursor = get_db().jobs.find(query).sort("created_at", -1).limit(_LIST_LIMIT)
    return jsonify([public_job(job) for job in cursor])
