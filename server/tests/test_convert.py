"""
Uploading a raw scan folder as a tar and converting it into an MRD file.

The tyger call is mocked, as in test_recon.py. Who can see the converted file
is pinned in test_access_integration.py.
"""
import io
from unittest import mock

import pytest
from bson import ObjectId

OID = "507f1f77bcf86cd799439011"


def staged(size=10):
    s3 = mock.Mock()
    s3.generate_presigned_url.return_value = "https://s3.example/put"
    s3.head_object.return_value = {"ContentLength": size}
    return s3


def test_convert_requires_a_token(client):
    response = client.post(f"/api/uploads/{OID}/convert",
                           json={"filename": "scan.tar", "converter": "convert"})
    assert response.status_code == 401


@pytest.mark.parametrize(
    "body, expected",
    [
        ({"filename": "scan.tar", "fileSize": 1, "kind": "mrd"},
         "File type .tar not allowed. Supported: .bin, .mrd, .mrd2"),
        ({"filename": "scan.mrd2", "fileSize": 1, "kind": "raw-tar"},
         "File type .mrd2 not allowed. Supported: .tar"),
        ({"filename": "scan.tar", "fileSize": 1, "kind": "zip"},
         "Unknown upload kind. Supported: mrd, raw-tar"),
    ],
)
def test_init_holds_each_kind_to_its_own_extensions(client, user, body, expected):
    with mock.patch("app.mrds.routes.get_s3_client") as s3:
        response = client.post("/api/uploads/init", json=body, headers=user())
    assert response.status_code == 400
    assert response.get_json()["error"] == expected
    s3.assert_not_called()


def test_init_signs_a_raw_tar_upload_into_the_callers_prefix(client, user):
    s3 = staged()
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(
            "/api/uploads/init", headers=user("sub-9"),
            json={"filename": "ischemia_121_1.tar", "fileSize": 1024, "kind": "raw-tar"},
        )
    assert response.status_code == 200
    key = s3.generate_presigned_url.call_args.kwargs["Params"]["Key"]
    assert key == f"uploads/staging/sub-9/{response.get_json()['uploadId']}"


def test_complete_never_accepts_a_tar_whatever_the_body_says(client, user):
    """complete promotes the staged object as a readable MRD file."""
    response = client.post(f"/api/uploads/{OID}/complete", headers=user(),
                           json={"filename": "scan.tar", "kind": "raw-tar"})
    assert response.status_code == 400
    assert response.get_json()["error"] == (
        "File type .tar not allowed. Supported: .bin, .mrd, .mrd2"
    )


@pytest.mark.parametrize(
    "upload_id, body, expected",
    [
        ("not-an-objectid", {"filename": "scan.tar", "converter": "convert"},
         "Invalid upload id"),
        (OID, {"filename": "scan.mrd2", "converter": "convert"},
         "File type .mrd2 not allowed. Supported: .tar"),
        (OID, {"filename": "scan.tar"}, "converter is required"),
        (OID, {"filename": "scan.tar", "converter": "convert_epsi"},
         "'convert_epsi' is not a converter. Supported: convert."),
        # A real stage, but not one that turns a tar into an MRD stream.
        (OID, {"filename": "scan.tar", "converter": "recon"},
         "'recon' is not a converter. Supported: convert."),
    ],
)
def test_convert_rejects_bad_input(client, user, upload_id, body, expected):
    with mock.patch("app.mrds.routes.start_job") as start:
        response = client.post(f"/api/uploads/{upload_id}/convert", json=body, headers=user())
    assert response.status_code == 400
    assert response.get_json()["error"] == expected
    start.assert_not_called()


def test_convert_into_a_group_the_caller_is_not_in_is_403(client, user):
    with mock.patch("app.mrds.routes.is_group_member", return_value=False) as member, \
            mock.patch("app.mrds.routes.start_job") as start:
        response = client.post(
            f"/api/uploads/{OID}/convert", headers=user("sub-9"),
            json={"filename": "scan.tar", "converter": "convert", "groupName": "team-b"},
        )
    assert response.status_code == 403
    member.assert_called_once_with("team-b", "sub-9")
    start.assert_not_called()


def test_convert_with_nothing_staged_is_404_and_starts_no_job(client, user):
    from botocore.exceptions import ClientError  # pylint: disable=import-outside-toplevel

    s3 = staged()
    s3.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
            mock.patch("app.mrds.routes.start_job") as start:
        response = client.post(f"/api/uploads/{OID}/convert", headers=user("sub-9"),
                               json={"filename": "scan.tar", "converter": "convert"})
    assert response.status_code == 404
    s3.head_object.assert_called_once_with(Bucket="test-bucket",
                                           Key=f"uploads/staging/sub-9/{OID}")
    start.assert_not_called()


def test_convert_refuses_an_oversize_tar(client, user):
    s3 = staged(size=2 * 1024 * 1024 * 1024 + 1)
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
            mock.patch("app.mrds.routes.start_job") as start:
        response = client.post(f"/api/uploads/{OID}/convert", headers=user(),
                               json={"filename": "scan.tar", "converter": "convert"})
    assert response.status_code == 400
    s3.delete_object.assert_called_once()
    start.assert_not_called()


def test_convert_stores_the_result_as_the_callers_file(
    db_app, db_client, user, monkeypatch, fake_s3, await_job
):
    """
    The whole convert path with the tyger call and S3 replaced: the caller's
    staged tar goes through the converter, the output lands at
    mrd_files/{upload id} owned by the caller in the requested group, and the
    staging object is dropped.
    """
    def fake_chain(stage_specs, source_fp, stage_context=None):
        assert [spec["id"] for spec in stage_specs] == ["convert"]
        with stage_context("convert"):
            assert source_fp.read() == b"tar bytes"
        return io.BytesIO(b"mrd2 bytes")

    monkeypatch.setattr("app.mrds.routes.run_chain", fake_chain)
    monkeypatch.setattr(
        "app.mrds.routes.read_mrdfile_header",
        lambda source, **kwargs: {"fileName": "MID1-epsi", "groupName": None,
                                  "ownerId": None,
                                  "ownerName": kwargs["owner_name"],
                                  "file_size": kwargs["file_size"]},
    )
    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        get_db().groups.insert_one({"name": "team-a", "members": ["sub-9"], "admins": []})

    staging_key = f"uploads/staging/sub-9/{OID}"
    fake_s3.staged[staging_key] = b"tar bytes"

    with mock.patch("app.mrds.routes.get_s3_client", return_value=staged()):
        response = db_client.post(
            f"/api/uploads/{OID}/convert", headers=user("sub-9"),
            json={"filename": "scan.tar", "converter": "convert", "groupName": "team-a",
                  "ownerName": "spoofed"},
        )
    assert response.status_code == 202

    job = await_job(response.get_json()["jobId"])
    assert job["status"] == "succeeded", job.get("error")
    assert job["kind"] == "convert"
    assert job["ownerId"] == "sub-9"
    assert job["staging_upload_id"] == OID
    assert job["output_file_id"] == OID
    assert [s["status"] for s in job["stages"]] == ["succeeded"]

    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        document = get_db().mrdfiles.find_one({"_id": ObjectId(OID)})

    assert document["s3_key"] == f"mrd_files/{OID}"
    assert document["ownerId"] == "sub-9"
    assert document["ownerName"] == "sub-9@upenn.edu"
    assert document["groupName"] == "team-a"
    assert document["file_size"] == len(b"mrd2 bytes")
    assert fake_s3.uploaded[f"mrd_files/{OID}"] == b"mrd2 bytes"
    assert staging_key in fake_s3.deleted
