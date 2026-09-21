"""
The job state machine, and the thread that advances it.

A job is one document in the `jobs` collection. `status` is one of
queued/running/succeeded/failed and each stage record carries its own copy;
there are deliberately no is_done or has_failed flags beside them, because two
representations of the same fact drift.

Crash recovery is the known limitation of running work on a thread instead of a
queue. Gunicorn runs 2 sync workers with `--timeout 60`, so a worker restart
abandons whatever was in flight: no thread survives to move the job out of
`running`, and the UI would poll it forever. Rather than a reaper process, a
read compares a running job's current stage against that stage's
timeout_seconds and reports the job failed once it is past it. That is a
presentation fix for a durability problem; the real fix is a queue.
"""
import contextlib
import logging
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import boto3
from flask import current_app

from app.auth import current_user
from app.errors import ApiError, BadRequest
from app.tyger.stages import get_stage

from data import get_db

logger = logging.getLogger(__name__)

QUEUED = "queued"
RUNNING = "running"
SUCCEEDED = "succeeded"
FAILED = "failed"
STATUSES = (QUEUED, RUNNING, SUCCEEDED, FAILED)

# How long a job may sit in `running` with no stage started before a read calls
# it abandoned. It only covers the gap between the status flip and the first
# stage; past that the stage's own timeout applies.
_STARTUP_GRACE_SECONDS = 120

_STALE_MESSAGE = "The job was interrupted and did not finish."


def _now():
    return datetime.now(timezone.utc)


def _jobs():
    return get_db().jobs


def _set(job_id, fields):
    _jobs().update_one({"_id": job_id}, {"$set": {**fields, "updated_at": _now()}})


def _set_stage(job_id, stage_id, fields):
    _jobs().update_one(
        {"_id": job_id, "stages.id": stage_id},
        {"$set": {**{f"stages.$.{k}": v for k, v in fields.items()},
                  "updated_at": _now()}},
    )


@dataclass(frozen=True)
class JobHandle:
    """What a job's work function is given to do its work and report progress."""

    job_id: Any
    payload: dict
    s3: Any

    @contextlib.contextmanager
    def stage(self, stage_id):
        """Record one stage's transitions. Pass this to run_chain as stage_context."""
        _set_stage(self.job_id, stage_id, {"status": RUNNING, "started_at": _now()})
        try:
            yield
        except ApiError as exc:
            _set_stage(self.job_id, stage_id,
                       {"status": FAILED, "error": exc.message, "ended_at": _now()})
            raise
        except Exception:
            _set_stage(self.job_id, stage_id,
                       {"status": FAILED, "error": "Something went wrong.",
                        "ended_at": _now()})
            raise
        _set_stage(self.job_id, stage_id, {"status": SUCCEEDED, "ended_at": _now()})


def _stage_records(payload):
    specs = payload.get("stages") or []
    if not isinstance(specs, list) or not specs:
        raise BadRequest("A job needs at least one stage.")

    records = []
    for spec in specs:
        if not isinstance(spec, dict):
            raise BadRequest("Each stage must be an object.")
        # Validated at creation so an unknown stage fails the request rather
        # than the background thread, where nobody is waiting for the answer.
        stage = get_stage(spec.get("id"))
        stage.build_args(spec.get("params"))
        records.append({"id": stage.id, "status": QUEUED, "error": None,
                        "started_at": None, "ended_at": None})
    return records


def start_job(kind, payload, work_fn):
    """
    Insert a queued job, start its thread, and return the job id.

    `work_fn(handle)` runs in that thread and returns the id of the file it
    produced, or None.
    """
    claims = current_user()
    owner_name = payload.get("ownerName")
    now = _now()

    document = {
        "kind": kind,
        "status": QUEUED,
        "stages": _stage_records(payload),
        "input_file_id": payload.get("inputFileId"),
        "staging_upload_id": payload.get("stagingUploadId"),
        "output_file_id": None,
        "params": payload.get("params"),
        "owner_name": owner_name,
        "owner_sub": claims.get("sub") if claims else owner_name,
        "created_at": now,
        "updated_at": now,
        "error": None,
    }

    job_id = _jobs().insert_one(document).inserted_id

    # The request context is gone by the time the thread runs, and get_db(),
    # get_s3_client() and every config lookup read current_app.
    app = current_app._get_current_object()  # pylint: disable=protected-access
    threading.Thread(
        target=_run_job, args=(app, job_id, payload, work_fn), daemon=True,
    ).start()

    return str(job_id)


def _run_job(app, job_id, payload, work_fn):
    with app.app_context():
        # A session of its own rather than the process-wide client from
        # get_s3_client(), which exists for per-request reuse on the main thread.
        s3 = boto3.session.Session().client("s3")
        handle = JobHandle(job_id=job_id, payload=payload, s3=s3)

        try:
            _set(job_id, {"status": RUNNING})
            output_file_id = work_fn(handle)
        except ApiError as exc:
            logger.info("job %s failed: %s", job_id, exc.message)
            _set(job_id, {"status": FAILED, "error": exc.message})
        except Exception:  # pylint: disable=broad-except
            logger.exception("job %s crashed", job_id)
            _set(job_id, {"status": FAILED, "error": "Something went wrong."})
        else:
            _set(job_id, {"status": SUCCEEDED, "output_file_id": output_file_id})


def _seconds_since(moment):
    if moment is None:
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return (_now() - moment).total_seconds()


def _is_abandoned(job):
    if job.get("status") != RUNNING:
        return False

    running = next((s for s in job.get("stages") or []
                    if s.get("status") == RUNNING), None)
    if running is None:
        return (_seconds_since(job.get("updated_at")) or 0) > _STARTUP_GRACE_SECONDS

    stage = get_stage(running["id"])
    return (_seconds_since(running.get("started_at")) or 0) > stage.timeout_seconds


def _serialise(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _serialise(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialise(v) for v in value]
    return value


def public_job(job):
    """A job document as the API returns it, with an abandoned run read as failed."""
    job = {**job, "_id": str(job["_id"])}

    if _is_abandoned(job):
        job["status"] = FAILED
        job["error"] = _STALE_MESSAGE
        job["stages"] = [
            {**s, "status": FAILED, "error": s.get("error") or _STALE_MESSAGE}
            if s.get("status") == RUNNING else s
            for s in job.get("stages") or []
        ]

    return _serialise(job)
