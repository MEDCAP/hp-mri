"""
The reconstruction route: what it refuses, and what one run leaves behind.

The chain itself is mocked. Every ghcr.io/medcap image returns 403 to an
anonymous pull, so a live tyger run dies in ImagePullBackOff and proves nothing;
what these tests hold is the sequence around it and the document it writes.

Who may reconstruct which file is pinned in test_access_integration.py.
"""
import io
from unittest import mock

import pytest
from bson import ObjectId

PARENT = ObjectId("507f1f77bcf86cd799439011")
OWNER = "user-1"

STAGES = [
    {"id": "shift"},
    {"id": "recon", "params": {"peaks": [{"name": "pyr", "modifiers": "s",
                                          "ppm": 9.7}]}},
]


@pytest.fixture()
def stored_file(db_app):
    """A converted scan already in the file list, which is what recon runs on."""
    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        get_db().mrdfiles.insert_one({
            "_id": PARENT,
            "fileName": "MID26575-epsigre",
            "ownerName": "kento",
            "ownerId": OWNER,
            "groupName": None,
            "original_filename": "ischemia_121_1.mrd2",
            "s3_key": f"mrd_files/{PARENT}",
        })
    return str(PARENT)


# --- refused before anything runs --------------------------------------------

def test_recon_requires_a_token(client):
    response = client.post("/api/recon", json={"fileId": str(PARENT), "stages": STAGES})
    assert response.status_code == 401


@pytest.mark.parametrize("body", [{"stages": STAGES}, {"fileId": 7, "stages": STAGES}])
def test_recon_requires_a_file(client, user, body):
    response = client.post("/api/recon", json=body, headers=user())
    assert response.status_code == 400
    assert response.get_json() == {"error": "fileId is required", "code": "bad_request"}


@pytest.mark.parametrize("file_id", [str(PARENT), "not-an-objectid"])
def test_recon_404s_on_a_file_the_caller_cannot_see(client, user, file_id):
    with mock.patch("app.recon.routes.get_mrdfile_by_id_with_auth", return_value=None) as check, \
            mock.patch("app.recon.routes.start_job") as start:
        response = client.post("/api/recon", json={"fileId": file_id, "stages": STAGES},
                               headers=user("user-2"))
    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"
    check.assert_called_once_with(file_id, "user-2")
    start.assert_not_called()


@pytest.mark.parametrize(
    "stages, expected",
    [
        ([], "A job needs at least one stage."),
        ([{"id": "sharpen"}], "'sharpen' is not a pipeline stage."),
        ([{"id": "recon", "params": {"peaks": [{"name": "pyr; rm -rf /",
                                                "ppm": 9.7}]}}],
         "'pyr; rm -rf /' is not a valid peak name."),
    ],
)
def test_recon_refuses_a_bad_chain_before_any_thread_starts(
    db_app, db_client, user, stored_file, stages, expected
):
    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": stages}, headers=user(OWNER),
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == expected
    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        assert get_db().jobs.count_documents({}) == 0


# --- one run -----------------------------------------------------------------

def _fake_header(source, **kwargs):  # pylint: disable=unused-argument
    return {"fileName": "MID26575-epsigre-recon",
            "ownerName": kwargs["owner_name"],
            "original_filename": kwargs["original_filename"],
            "groupName": None, "ownerId": None,
            "isReconstructed": True}


def test_recon_stores_its_output_as_a_private_file_traceable_to_the_source(
    db_app, db_client, user, monkeypatch, fake_s3, await_job, stored_file
):
    def fake_chain(stage_specs, source_fp, stage_context=None):
        assert [spec["id"] for spec in stage_specs] == ["shift", "recon"]
        assert source_fp.read() == b"raw scan"
        for spec in stage_specs:
            with stage_context(spec["id"]):
                pass
        return io.BytesIO(b"reconstructed")

    monkeypatch.setattr("app.recon.routes.run_chain", fake_chain)
    monkeypatch.setattr("app.recon.routes.read_mrdfile_header", _fake_header)

    fake_s3.staged[f"mrd_files/{stored_file}"] = b"raw scan"

    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": STAGES,
                            "ownerName": "spoofed"},
        headers=user(OWNER),
    )
    assert response.status_code == 202

    job = await_job(response.get_json()["jobId"])
    assert job["status"] == "succeeded", job.get("error")
    assert job["kind"] == "recon"
    assert job["ownerId"] == OWNER
    assert job["input_file_id"] == stored_file
    assert [s["status"] for s in job["stages"]] == ["succeeded", "succeeded"]

    output_id = job["output_file_id"]
    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        document = get_db().mrdfiles.find_one({"_id": ObjectId(output_id)})

    assert document["parentFileId"] == stored_file
    assert [s["id"] for s in document["reconStages"]] == ["shift", "recon"]
    assert document["s3_key"] == f"mrd_files/{output_id}"
    # Owned by the caller and private, whatever the body says.
    assert document["ownerId"] == OWNER
    assert document["ownerName"] == f"{OWNER}@upenn.edu"
    assert document["groupName"] is None
    # Named after the scan it came from, so the two sit together in the list.
    assert document["original_filename"] == "ischemia_121_1-recon.mrd2"
    assert fake_s3.uploaded[f"mrd_files/{output_id}"] == b"reconstructed"


def test_a_failing_stage_leaves_no_output_file(
    db_app, db_client, user, monkeypatch, fake_s3, await_job, stored_file
):
    """A half-written reconstruction in the file list is worse than none."""
    from app.tyger.runner import StageFailed  # pylint: disable=import-outside-toplevel

    def fake_chain(stage_specs, source_fp, stage_context=None):  # pylint: disable=unused-argument
        with stage_context("shift"):
            raise StageFailed("The shift stage failed.")

    monkeypatch.setattr("app.recon.routes.run_chain", fake_chain)
    fake_s3.staged[f"mrd_files/{stored_file}"] = b"raw scan"

    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": STAGES}, headers=user(OWNER),
    )
    job = await_job(response.get_json()["jobId"])

    assert job["status"] == "failed"
    assert job["error"] == "The shift stage failed."
    assert job["output_file_id"] is None
    assert not fake_s3.uploaded

    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        assert get_db().mrdfiles.count_documents({}) == 1


@pytest.mark.usefixtures("db_app")
def test_an_unexpected_failure_records_no_exception_text(
        db_client, user, monkeypatch, fake_s3, await_job, stored_file):
    def fake_chain(stage_specs, source_fp, stage_context=None):  # pylint: disable=unused-argument
        with stage_context("shift"):
            raise RuntimeError("s3://secret-bucket/internal/path exploded")

    monkeypatch.setattr("app.recon.routes.run_chain", fake_chain)
    fake_s3.staged[f"mrd_files/{stored_file}"] = b"raw scan"

    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": STAGES}, headers=user(OWNER),
    )
    job_id = response.get_json()["jobId"]
    await_job(job_id)

    body = db_client.get(f"/api/jobs/{job_id}", headers=user(OWNER)).get_data(as_text=True)
    assert "Something went wrong." in body
    assert "secret-bucket" not in body
