"""
The reconstruction route: what it refuses, and what one run leaves behind.

The chain itself is mocked. Every ghcr.io/medcap image returns 403 to an
anonymous pull, so a live tyger run dies in ImagePullBackOff and proves nothing;
what these tests hold is the sequence around it and the document it writes.
"""
import io

import pytest
from bson import ObjectId

PARENT = ObjectId("507f1f77bcf86cd799439011")

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
            "original_filename": "ischemia_121_1.mrd2",
            "s3_key": f"mrd_files/{PARENT}",
        })
    return str(PARENT)


def test_recon_requires_a_file(db_client):
    response = db_client.post("/api/recon", json={"stages": STAGES})
    assert response.status_code == 400
    assert response.get_json()["error"] == "fileId is required"


def test_recon_404s_on_a_file_that_does_not_exist(db_client):
    response = db_client.post(
        "/api/recon", json={"fileId": str(PARENT), "stages": STAGES},
    )
    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"


def test_recon_rejects_a_malformed_file_id(db_client):
    response = db_client.post(
        "/api/recon", json={"fileId": "not-an-objectid", "stages": STAGES},
    )
    assert response.status_code == 400
    assert response.get_json()["code"] == "bad_request"


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
    db_client, stored_file, stages, expected
):
    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": stages},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == expected


def test_recon_stores_its_output_as_a_file_traceable_to_the_source(
    db_app, db_client, monkeypatch, fake_s3, await_job, stored_file
):
    def fake_chain(stage_specs, source_fp, stage_context=None):
        assert [spec["id"] for spec in stage_specs] == ["shift", "recon"]
        assert source_fp.read() == b"raw scan"
        for spec in stage_specs:
            with stage_context(spec["id"]):
                pass
        return io.BytesIO(b"reconstructed")

    monkeypatch.setattr("app.recon.routes.run_chain", fake_chain)
    monkeypatch.setattr(
        "app.recon.routes.read_mrdfile_header",
        lambda source, **kwargs: {"fileName": "MID26575-epsigre-recon",
                                  "ownerName": kwargs["owner_name"],
                                  "original_filename": kwargs["original_filename"],
                                  "isReconstructed": True},
    )

    fake_s3.staged[f"mrd_files/{stored_file}"] = b"raw scan"

    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": STAGES},
    )
    assert response.status_code == 202

    job = await_job(response.get_json()["jobId"])
    assert job["status"] == "succeeded", job.get("error")
    assert job["kind"] == "recon"
    assert job["input_file_id"] == stored_file
    assert [s["status"] for s in job["stages"]] == ["succeeded", "succeeded"]

    output_id = job["output_file_id"]
    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        document = get_db().mrdfiles.find_one({"_id": ObjectId(output_id)})

    assert document["parentFileId"] == stored_file
    assert [s["id"] for s in document["reconStages"]] == ["shift", "recon"]
    assert document["s3_key"] == f"mrd_files/{output_id}"
    # Named after the scan it came from, so the two sit together in the list.
    assert document["original_filename"] == "ischemia_121_1-recon.mrd2"
    assert fake_s3.uploaded[f"mrd_files/{output_id}"] == b"reconstructed"


def test_a_failing_stage_leaves_no_output_file(
    db_app, db_client, monkeypatch, fake_s3, await_job, stored_file
):
    """A half-written reconstruction in the file list is worse than none."""
    from app.tyger.runner import StageFailed  # pylint: disable=import-outside-toplevel

    def fake_chain(stage_specs, source_fp, stage_context=None):
        with stage_context("shift"):
            raise StageFailed("The shift stage failed.")

    monkeypatch.setattr("app.recon.routes.run_chain", fake_chain)
    fake_s3.staged[f"mrd_files/{stored_file}"] = b"raw scan"

    response = db_client.post(
        "/api/recon", json={"fileId": stored_file, "stages": STAGES},
    )
    job = await_job(response.get_json()["jobId"])

    assert job["status"] == "failed"
    assert job["error"] == "The shift stage failed."
    assert job["output_file_id"] is None
    assert not fake_s3.uploaded

    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        assert get_db().mrdfiles.count_documents({}) == 1
