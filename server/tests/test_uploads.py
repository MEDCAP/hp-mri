"""
The presigned upload lifecycle and its validation.

The validation cases are the reason `_validated_upload_fields` exists: init and
complete used to check the same fields separately and word the failures
differently.
"""
from unittest import mock

import pytest
from botocore.exceptions import ClientError

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


def test_abort_is_always_204_even_for_a_junk_id(client):
    """Abort is best effort; the staging lifecycle rule reaps whatever is missed."""
    with mock.patch("app.mrds.routes.get_s3_client") as factory:
        assert client.post("/api/uploads/not-an-oid/abort").status_code == 204
        factory.return_value.delete_object.assert_not_called()

        assert client.post(f"/api/uploads/{OID}/abort").status_code == 204
        factory.return_value.delete_object.assert_called_once()
