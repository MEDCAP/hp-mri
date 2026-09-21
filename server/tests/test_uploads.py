"""
The presigned upload lifecycle and its validation.

The validation cases are the reason `_validated_upload_fields` exists: init and
complete used to check the same fields separately and word the failures
differently.
"""
import io
from unittest import mock

import pytest
from botocore.exceptions import ClientError
from bson import ObjectId

OID = "507f1f77bcf86cd799439011"


def _client_error(code):
    return ClientError({"Error": {"Code": code, "Message": code}}, "HeadObject")


@pytest.mark.parametrize(
    "body, expected",
    [
        ({}, "filename is required"),
        ({"filename": "scan.txt", "ownerName": "kento", "fileSize": 1},
         "File type .txt not allowed. Supported: .bin, .mrd, .mrd2"),
        ({"filename": "scan.mrd", "fileSize": 1}, "ownerName is required"),
        ({"filename": "scan.mrd", "ownerName": "kento"},
         "fileSize must be a positive integer"),
        ({"filename": "scan.mrd", "ownerName": "kento", "fileSize": 0},
         "fileSize must be a positive integer"),
        ({"filename": "scan.mrd", "ownerName": "kento", "fileSize": -5},
         "fileSize must be a positive integer"),
        ({"filename": "scan.mrd", "ownerName": "kento", "fileSize": "big"},
         "fileSize must be a positive integer"),
    ],
)
def test_init_rejects_bad_input(client, body, expected):
    response = client.post("/api/uploads/init", json=body)
    assert response.status_code == 400
    assert response.get_json()["error"] == expected


def test_init_rejects_bool_file_size(client):
    """
    bool is a subclass of int, so the old `isinstance(file_size, int)` check
    accepted True and went on to sign an upload for a 1-byte file.
    """
    response = client.post(
        "/api/uploads/init",
        json={"filename": "scan.mrd", "ownerName": "kento", "fileSize": True},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "fileSize must be a positive integer"


def test_init_rejects_oversize_declaration(client, app):
    response = client.post(
        "/api/uploads/init",
        json={
            "filename": "scan.mrd",
            "ownerName": "kento",
            "fileSize": app.config["MAX_UPLOAD_BYTES"] + 1,
        },
    )
    assert response.status_code == 400
    assert "maximum upload size" in response.get_json()["error"]


def test_init_mints_a_presigned_url_into_the_staging_prefix(client, app):
    s3 = mock.Mock()
    s3.generate_presigned_url.return_value = "https://s3.example/put"

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(
            "/api/uploads/init",
            json={"filename": "scan.mrd", "ownerName": "kento", "fileSize": 1024},
        )

    body = response.get_json()
    assert response.status_code == 200
    assert body["uploadUrl"] == "https://s3.example/put"
    assert body["expiresIn"] == app.config["PRESIGN_EXPIRY_SECONDS"]

    params = s3.generate_presigned_url.call_args.kwargs["Params"]
    assert params["Bucket"] == "test-bucket"
    assert params["Key"].startswith(app.config["UPLOAD_STAGING_PREFIX"])
    # The signature is bound to the content type the browser must send.
    assert params["ContentType"] == "application/octet-stream"

    # No database write happens at init, so an abandoned upload leaves no state.
    assert body["uploadId"]


def test_complete_rejects_a_malformed_upload_id(client):
    response = client.post(
        "/api/uploads/not-an-objectid/complete",
        json={"filename": "scan.mrd", "ownerName": "kento"},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "Invalid upload id"


def test_complete_404s_when_nothing_was_staged(client):
    s3 = mock.Mock()
    s3.head_object.side_effect = _client_error("404")

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(
            f"/api/uploads/{OID}/complete",
            json={"filename": "scan.mrd", "ownerName": "kento"},
        )

    assert response.status_code == 404
    assert "may have failed or expired" in response.get_json()["error"]


def test_complete_surfaces_a_real_s3_outage_as_503_not_404(client):
    """
    A missing staged object is the client's problem; an unreachable S3 is not.
    The old code collapsed both into 404.
    """
    s3 = mock.Mock()
    s3.head_object.side_effect = _client_error("ServiceUnavailable")

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(
            f"/api/uploads/{OID}/complete",
            json={"filename": "scan.mrd", "ownerName": "kento"},
        )

    assert response.status_code == 503
    assert response.get_json()["code"] == "storage_unavailable"


def test_complete_enforces_the_real_size_at_the_only_point_it_can(client, app):
    """
    A presigned PUT cannot cap its own size, so the ceiling is enforced against
    the object S3 actually received -- and the oversize object is deleted.
    """
    s3 = mock.Mock()
    s3.head_object.return_value = {"ContentLength": app.config["MAX_UPLOAD_BYTES"] + 1}

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(
            f"/api/uploads/{OID}/complete",
            json={"filename": "scan.mrd", "ownerName": "kento"},
        )

    assert response.status_code == 400
    assert "maximum upload size" in response.get_json()["error"]
    s3.delete_object.assert_called_once()


def test_complete_promotes_by_server_side_copy_and_inserts_metadata(client):
    """The file bytes must never travel through this process."""
    s3 = mock.Mock()
    s3.head_object.return_value = {"ContentLength": 2048}
    s3.get_object.return_value = {"Body": mock.Mock(read=lambda: b"\x00")}

    metadata = {"fileName": "MID1-proto", "ownerName": "kento"}

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.read_mrdfile_header", return_value=metadata), \
         mock.patch("app.mrds.routes.insert_mrdfile_header", return_value=OID) as insert:
        response = client.post(
            f"/api/uploads/{OID}/complete",
            json={"filename": "scan.mrd", "ownerName": "kento"},
        )

    body = response.get_json()
    assert response.status_code == 201
    assert body["fileId"] == OID
    assert body["s3_key"] == f"mrd_files/{OID}"

    s3.copy_object.assert_called_once()
    copy = s3.copy_object.call_args.kwargs
    assert copy["Key"] == f"mrd_files/{OID}"

    # The document id must equal the upload id, or the S3 key and the Mongo _id
    # diverge and the file becomes unreachable.
    assert str(insert.call_args.kwargs["doc_id"]) == OID


# --- upload kinds and conversion ---------------------------------------------
#
# A raw scan is a folder tarred in the browser, so it arrives through the same
# presigned upload as an .mrd2 and differs only in what it is allowed to be
# called and what happens to it afterwards.

@pytest.mark.parametrize(
    "body, expected",
    [
        ({"filename": "scan.tar", "ownerName": "kento", "fileSize": 1},
         "File type .tar not allowed. Supported: .bin, .mrd, .mrd2"),
        ({"filename": "scan.mrd2", "ownerName": "kento", "fileSize": 1,
          "kind": "raw-tar"},
         "File type .mrd2 not allowed. Supported: .tar"),
        ({"filename": "scan.tar", "ownerName": "kento", "fileSize": 1,
          "kind": "zip"},
         "Upload kind zip not allowed. Supported: mrd, raw-tar"),
    ],
)
def test_init_holds_each_kind_to_its_own_extensions(client, body, expected):
    response = client.post("/api/uploads/init", json=body)
    assert response.status_code == 400
    assert response.get_json()["error"] == expected


def test_init_signs_a_raw_tar_upload(client):
    s3 = mock.Mock()
    s3.generate_presigned_url.return_value = "https://s3.example/put"

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(
            "/api/uploads/init",
            json={"filename": "ischemia_121_1.tar", "ownerName": "kento",
                  "fileSize": 1024, "kind": "raw-tar"},
        )

    assert response.status_code == 200


def test_complete_never_accepts_a_tar_whatever_the_body_says(client):
    """
    complete promotes the staged object as a readable MRD file, so its kind is
    not the client's to choose.
    """
    response = client.post(
        f"/api/uploads/{OID}/complete",
        json={"filename": "scan.tar", "ownerName": "kento", "kind": "raw-tar"},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == (
        "File type .tar not allowed. Supported: .bin, .mrd, .mrd2"
    )


@pytest.mark.parametrize(
    "upload_id, body, expected",
    [
        ("not-an-objectid",
         {"filename": "scan.tar", "ownerName": "kento", "converter": "convert"},
         "Invalid upload id"),
        (OID, {"filename": "scan.mrd2", "ownerName": "kento", "converter": "convert"},
         "File type .mrd2 not allowed. Supported: .tar"),
        (OID, {"filename": "scan.tar", "ownerName": "kento"},
         "converter is required"),
        (OID, {"filename": "scan.tar", "ownerName": "kento",
               "converter": "convert_epsi"},
         "'convert_epsi' is not a pipeline stage."),
    ],
)
def test_convert_rejects_bad_input(client, upload_id, body, expected):
    response = client.post(f"/api/uploads/{upload_id}/convert", json=body)
    assert response.status_code == 400
    assert response.get_json()["error"] == expected


def test_convert_runs_the_converter_and_stores_the_result_as_a_file(
    db_app, db_client, monkeypatch, fake_s3, await_job
):
    """
    The whole convert path with the tyger call and S3 replaced: the staged tar
    goes through the converter, the output lands at mrd_files/{upload id}, the
    document carries that key, and the staging object is dropped.
    """
    def fake_chain(stage_specs, source_fp, stage_context=None):
        assert [spec["id"] for spec in stage_specs] == ["convert"]
        with stage_context("convert"):
            assert source_fp.read() == b"tar bytes"
        return io.BytesIO(b"mrd2 bytes")

    monkeypatch.setattr("app.mrds.routes.run_chain", fake_chain)
    monkeypatch.setattr(
        "app.mrds.routes.read_mrdfile_header",
        lambda source, **kwargs: {"fileName": "MID1-epsi",
                                  "ownerName": kwargs["owner_name"],
                                  "file_size": kwargs["file_size"]},
    )

    staging_key = f"{db_app.config['UPLOAD_STAGING_PREFIX']}{OID}"
    fake_s3.staged[staging_key] = b"tar bytes"

    response = db_client.post(
        f"/api/uploads/{OID}/convert",
        json={"filename": "scan.tar", "ownerName": "kento", "converter": "convert"},
    )
    assert response.status_code == 202

    job = await_job(response.get_json()["jobId"])
    assert job["status"] == "succeeded", job.get("error")
    assert job["kind"] == "convert"
    assert job["staging_upload_id"] == OID
    assert job["output_file_id"] == OID
    assert [s["status"] for s in job["stages"]] == ["succeeded"]

    with db_app.app_context():
        from data import get_db  # pylint: disable=import-outside-toplevel

        document = get_db().mrdfiles.find_one({"_id": ObjectId(OID)})

    assert document["s3_key"] == f"mrd_files/{OID}"
    assert document["ownerName"] == "kento"
    assert document["file_size"] == len(b"mrd2 bytes")
    assert fake_s3.uploaded[f"mrd_files/{OID}"] == b"mrd2 bytes"
    assert staging_key in fake_s3.deleted


def test_abort_is_always_204_even_for_a_junk_id(client):
    """Abort is best effort; the staging lifecycle rule reaps whatever is missed."""
    with mock.patch("app.mrds.routes.get_s3_client") as factory:
        assert client.post("/api/uploads/not-an-oid/abort").status_code == 204
        factory.return_value.delete_object.assert_not_called()

        assert client.post(f"/api/uploads/{OID}/abort").status_code == 204
        factory.return_value.delete_object.assert_called_once()
