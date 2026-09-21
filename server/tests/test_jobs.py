"""
The job state machine, and what a failing stage is allowed to tell a caller.

The lifecycle tests need a real database, because the point of them is the
document a background thread writes; they skip without MONGO_TEST_URI like the
rest of tests/test_data_integration.py. The leak test and the stale-run tests
need neither a database nor a subprocess and always run.
"""
import io
import subprocess
import threading
import time
from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId

from app.jobs.service import FAILED, QUEUED, RUNNING, SUCCEEDED, public_job, start_job
from app.tyger.runner import run_chain

SECRET_STDERR = (
    "error: buffer 7f3a9c write failed on cluster tep-centralus-1 "
    "(/mnt/tyger/spool/ab12cd34)"
)

RECON_STAGES = [
    {"id": "shift"},
    {"id": "recon", "params": {"peaks": [{"name": "pyr", "modifiers": "s",
                                          "ppm": 9.7}]}},
]


def _fake_tyger(output=b"reconstructed", returncode=0, stderr=b""):
    def run(cmd, **kwargs):
        kwargs["stdout"].write(output)
        return subprocess.CompletedProcess(cmd, returncode, b"", stderr)

    return run


def _await_status(db, job_id, *wanted, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        job = db.jobs.find_one({"_id": job_id})
        if job and job["status"] in wanted:
            return job
        time.sleep(0.01)
    raise AssertionError(
        f"job never reached {wanted}: {db.jobs.find_one({'_id': job_id})}"
    )


# --- creation ---------------------------------------------------------------

def test_a_new_job_is_queued_with_every_stage_queued(app, monkeypatch):
    captured = {}

    class FakeCollection:
        """Captures the document as inserted, before the thread touches it."""

        def insert_one(self, document):
            captured.update(document)
            return type("R", (), {"inserted_id": "abc"})()

        def update_one(self, *args, **kwargs):
            pass

    monkeypatch.setattr("app.jobs.service._jobs", FakeCollection)

    with app.test_request_context("/api/recon"):
        start_job("recon", {"stages": RECON_STAGES, "ownerName": "kento"},
                  work_fn=lambda handle: None)

    assert captured["status"] == QUEUED
    assert [s["id"] for s in captured["stages"]] == ["shift", "recon"]
    assert {s["status"] for s in captured["stages"]} == {QUEUED}
    assert captured["owner_name"] == "kento"
    # REQUIRE_AUTH is off and no token was presented, so the body's name is all
    # the identity there is.
    assert captured["owner_sub"] == "kento"


def test_an_unknown_stage_fails_the_request_not_the_thread(app):
    from app.errors import BadRequest  # pylint: disable=import-outside-toplevel

    with app.test_request_context("/api/recon"):
        with pytest.raises(BadRequest):
            start_job("recon", {"stages": [{"id": "convert_epsi"}]},
                      work_fn=lambda handle: None)


# --- lifecycle against a real database --------------------------------------

def test_a_job_runs_queued_then_running_then_succeeded(db_app, monkeypatch):
    monkeypatch.setattr("app.tyger.runner.subprocess.run", _fake_tyger())

    release = threading.Event()

    def work(handle):
        release.wait(timeout=5)
        with run_chain(RECON_STAGES, io.BytesIO(b"input"),
                       stage_context=handle.stage) as result:
            assert result.read() == b"reconstructed"
        return "outputfileid"

    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        db = get_db()
        with db_app.test_request_context("/api/recon"):
            job_id = start_job("recon", {"stages": RECON_STAGES,
                                         "inputFileId": "507f1f77bcf86cd799439011"},
                               work_fn=work)

        from bson import ObjectId  # pylint: disable=import-outside-toplevel

        oid = ObjectId(job_id)

        running = _await_status(db, oid, RUNNING)
        assert running["error"] is None

        release.set()
        finished = _await_status(db, oid, SUCCEEDED, FAILED)

    assert finished["status"] == SUCCEEDED, finished.get("error")
    assert finished["output_file_id"] == "outputfileid"
    assert [s["status"] for s in finished["stages"]] == [SUCCEEDED, SUCCEEDED]
    assert all(s["started_at"] and s["ended_at"] for s in finished["stages"])


def test_a_failing_stage_records_a_safe_message_and_logs_the_rest(
    db_app, db_client, monkeypatch, caplog
):
    monkeypatch.setattr(
        "app.tyger.runner.subprocess.run",
        _fake_tyger(returncode=1, stderr=SECRET_STDERR.encode()),
    )

    def work(handle):
        with run_chain(RECON_STAGES, io.BytesIO(b"input"),
                       stage_context=handle.stage):
            return None

    with db_app.app_context():
        from bson import ObjectId  # pylint: disable=import-outside-toplevel
        from data import get_db  # pylint: disable=import-outside-toplevel

        with db_app.test_request_context("/api/recon"):
            job_id = start_job("recon", {"stages": RECON_STAGES}, work_fn=work)

        job = _await_status(get_db(), ObjectId(job_id), FAILED, SUCCEEDED)

    assert job["status"] == FAILED
    assert job["error"] == "The shift stage failed."
    assert job["stages"][0]["status"] == FAILED
    assert job["stages"][1]["status"] == QUEUED

    body = db_client.get(f"/api/jobs/{job_id}").get_data(as_text=True)
    assert "The shift stage failed." in body
    for leak in ("tep-centralus-1", "7f3a9c", "/mnt/tyger", "ab12cd34"):
        assert leak not in body, leak

    assert SECRET_STDERR in caplog.text, "the diagnosis must reach the log"


def test_list_filters_by_file_and_status(db_app, db_client):
    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        now = datetime.now(timezone.utc)
        get_db().jobs.insert_many([
            {"kind": "recon", "status": SUCCEEDED, "stages": [],
             "input_file_id": "file-a", "created_at": now},
            {"kind": "recon", "status": FAILED, "stages": [],
             "input_file_id": "file-a", "created_at": now - timedelta(minutes=1)},
            {"kind": "convert", "status": SUCCEEDED, "stages": [],
             "input_file_id": "file-b", "created_at": now},
        ])

    assert len(db_client.get("/api/jobs?fileId=file-a").get_json()) == 2
    assert len(db_client.get("/api/jobs?fileId=file-a&status=failed").get_json()) == 1
    assert db_client.get("/api/jobs?status=nonsense").status_code == 400


# --- reading -----------------------------------------------------------------

def _running_job(started_seconds_ago, stage_id="shift"):
    started = datetime.now(timezone.utc) - timedelta(seconds=started_seconds_ago)
    return {
        "_id": "507f1f77bcf86cd799439011",
        "status": RUNNING,
        "error": None,
        "stages": [{"id": stage_id, "status": RUNNING, "error": None,
                    "started_at": started, "ended_at": None}],
        "updated_at": started,
    }


def test_a_job_past_its_stage_timeout_reads_as_failed():
    """
    A worker restart abandons the thread, leaving the document in `running`
    forever. Read detection is what stops the UI spinning on it.
    """
    job = public_job(_running_job(started_seconds_ago=3601))

    assert job["status"] == FAILED
    assert job["error"] == "The job was interrupted and did not finish."
    assert job["stages"][0]["status"] == FAILED


def test_a_job_inside_its_stage_timeout_is_left_running():
    assert public_job(_running_job(started_seconds_ago=30))["status"] == RUNNING


def test_a_job_that_never_started_a_stage_is_abandoned_after_the_grace_period():
    job = _running_job(started_seconds_ago=300)
    job["stages"][0].update(status=QUEUED, started_at=None)

    assert public_job(job)["status"] == FAILED


def test_a_finished_job_is_never_rewritten():
    job = _running_job(started_seconds_ago=99999)
    job["status"] = SUCCEEDED
    job["stages"][0]["status"] = SUCCEEDED

    assert public_job(job)["status"] == SUCCEEDED


def test_dates_are_serialised_as_strings():
    job = public_job(_running_job(started_seconds_ago=1))
    assert isinstance(job["stages"][0]["started_at"], str)


def test_a_malformed_job_id_uses_the_shared_bad_request_envelope(client):
    response = client.get("/api/jobs/not-an-object-id")
    body = response.get_json()

    assert response.status_code == 400
    assert body == {"error": "Invalid file ID.", "code": "bad_request"}


def test_a_missing_job_is_a_not_found(db_client):
    response = db_client.get("/api/jobs/507f1f77bcf86cd799439011")

    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"


def test_the_cognito_subject_id_never_leaves_the_server(db_app, db_client):
    """
    Every caller can already see every file and every job, so owner_name is not
    a secret. The Cognito subject id behind it is an internal identifier no
    client has a use for.
    """
    with db_app.app_context():
        from data import get_db

        get_db().jobs.insert_one({
            **_running_job(0), "_id": ObjectId("507f1f77bcf86cd799439011"),
            "owner_name": "kento", "owner_sub": "9f1c-cognito-subject",
            "created_at": datetime.now(timezone.utc),
        })

    response = db_client.get("/api/jobs/507f1f77bcf86cd799439011")
    body = response.get_data(as_text=True)

    assert response.get_json()["owner_name"] == "kento"
    assert "owner_sub" not in response.get_json()
    assert "9f1c-cognito-subject" not in body
