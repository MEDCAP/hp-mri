"""File, viewer and group routes, with the data layer mocked."""
import io
from unittest import mock

import pytest
from botocore.exceptions import ClientError

SECRET = "arn:aws:iam::862065604168:role/secret"
OID = "507f1f77bcf86cd799439011"


def client_error(code="AccessDenied"):
    return ClientError({"Error": {"Code": code, "Message": SECRET}}, "Op")


# --- listing ------------------------------------------------------------------

@pytest.mark.parametrize("query", ["limit=abc", "skip=x", "limit=-1", "skip=-5"])
def test_bad_pagination_is_a_400_that_says_why(client, query):
    response = client.get(f"/api/mrd-files?{query}")
    assert response.status_code == 400
    assert "limit" in response.get_json()["error"]


def test_limit_is_capped_at_200(client):
    with mock.patch("app.mrds.routes.list_mrdfiles_for_user", return_value=[]) as listed:
        client.get("/api/mrd-files?limit=10000")
    assert listed.call_args.kwargs["limit"] == 200


def test_guest_listing_is_the_public_scope_with_narrow_fields(client):
    with mock.patch("app.mrds.routes.list_mrdfiles_for_user", return_value=[]) as listed:
        response = client.get("/api/mrd-files")
    assert response.status_code == 200
    assert listed.call_args.args[0] is None
    projection = listed.call_args.kwargs["projection"]
    # The guest listing must not expose ownership or storage internals.
    assert "s3_key" not in projection and "ownerId" not in projection


def test_file_details_for_an_inaccessible_file_is_404(client, user):
    with mock.patch("app.mrds.routes.get_mrdfile_by_id_with_auth", return_value=None):
        response = client.get(f"/api/mrd-files/{OID}", headers=user())
    assert response.status_code == 404
    assert response.get_json()["error"] == "File not found or access denied"


# --- upload -------------------------------------------------------------------

MAX = 2 * 1024 * 1024 * 1024


def staged_s3(size=10, head_error=None):
    """An S3 mock holding one staged object of `size` bytes."""
    s3 = mock.Mock()
    s3.generate_presigned_url.return_value = "https://s3.example/put"
    if head_error:
        s3.head_object.side_effect = head_error
    else:
        s3.head_object.return_value = {"ContentLength": size}
    s3.get_object.return_value = {"Body": io.BytesIO(b"x" * size)}
    return s3


@pytest.mark.parametrize("path", ["/api/uploads/init", f"/api/uploads/{OID}/complete",
                                  f"/api/uploads/{OID}/abort"])
def test_upload_routes_require_a_token(client, path):
    assert client.post(path, json={"filename": "a.mrd", "fileSize": 1}).status_code == 401


@pytest.mark.parametrize("body", [{}, {"filename": "notes.txt", "fileSize": 1},
                                  {"filename": "a.mrd"}, {"filename": "a.mrd", "fileSize": True},
                                  {"filename": "a.mrd", "fileSize": MAX + 1}])
def test_init_validates_the_body(client, user, body):
    with mock.patch("app.mrds.routes.get_s3_client") as s3:
        response = client.post("/api/uploads/init", headers=user(), json=body)
    assert response.status_code == 400
    s3.assert_not_called()


def test_init_signs_a_put_into_the_callers_staging_prefix(client, user):
    s3 = staged_s3()
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post("/api/uploads/init", headers=user("sub-9"),
                               json={"filename": "scan.mrd", "fileSize": 10, "groupName": None})
    assert response.status_code == 200
    upload_id = response.get_json()["uploadId"]
    key = s3.generate_presigned_url.call_args.kwargs["Params"]["Key"]
    assert key == f"uploads/staging/sub-9/{upload_id}"


@pytest.mark.parametrize("path", ["/api/uploads/init", f"/api/uploads/{OID}/complete"])
def test_a_non_member_group_is_403(client, user, path):
    s3 = staged_s3()
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.is_group_member", return_value=False) as member, \
         mock.patch("app.mrds.routes.insert_mrdfile_header") as insert:
        response = client.post(path, headers=user("sub-9"),
                               json={"filename": "a.mrd", "fileSize": 10, "groupName": "team-b"})
    assert response.status_code == 403
    member.assert_called_once_with("team-b", "sub-9")
    insert.assert_not_called()


def test_complete_records_owner_and_group_from_the_token(client, user):
    s3 = staged_s3()
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.is_group_member", return_value=True), \
         mock.patch("app.mrds.routes.read_mrdfile_header",
                    return_value={"fileName": "f", "ownerName": "sub-9@upenn.edu"}) as parse, \
         mock.patch("app.mrds.routes.insert_mrdfile_header", return_value=OID) as insert:
        response = client.post(f"/api/uploads/{OID}/complete", headers=user("sub-9"),
                               json={"filename": "scan.mrd", "groupName": "team-a",
                                     "ownerName": "Spoofed"})

    assert response.status_code == 201
    assert parse.call_args.kwargs["owner_name"] == "sub-9@upenn.edu"
    doc = insert.call_args.args[0]
    assert doc["ownerId"] == "sub-9" and doc["groupName"] == "team-a"
    assert doc["s3_key"] == f"mrd_files/{OID}"
    assert str(insert.call_args.kwargs["doc_id"]) == OID
    staging = f"uploads/staging/sub-9/{OID}"
    s3.head_object.assert_called_once_with(Bucket="test-bucket", Key=staging)
    s3.delete_object.assert_called_once_with(Bucket="test-bucket", Key=staging)


def test_complete_without_a_group_is_private(client, user):
    with mock.patch("app.mrds.routes.get_s3_client", return_value=staged_s3()), \
         mock.patch("app.mrds.routes.is_group_member") as member, \
         mock.patch("app.mrds.routes.read_mrdfile_header", return_value={"fileName": "f"}), \
         mock.patch("app.mrds.routes.insert_mrdfile_header", return_value=OID) as insert:
        response = client.post(f"/api/uploads/{OID}/complete", headers=user(),
                               json={"filename": "scan.mrd", "groupName": None})
    assert response.status_code == 201
    assert insert.call_args.args[0]["groupName"] is None
    member.assert_not_called()


def test_complete_rejects_an_oversize_object_and_deletes_it(client, user):
    s3 = staged_s3(size=MAX + 1)
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.insert_mrdfile_header") as insert:
        response = client.post(f"/api/uploads/{OID}/complete", headers=user(),
                               json={"filename": "scan.mrd"})
    assert response.status_code == 400
    s3.delete_object.assert_called_once()
    s3.get_object.assert_not_called()
    insert.assert_not_called()


def test_complete_with_no_staged_object_is_404(client, user):
    s3 = staged_s3(head_error=client_error("404"))
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(f"/api/uploads/{OID}/complete", headers=user(),
                               json={"filename": "scan.mrd"})
    assert response.status_code == 404


def test_complete_rejects_a_malformed_upload_id(client, user):
    with mock.patch("app.mrds.routes.get_s3_client") as s3:
        response = client.post("/api/uploads/not-an-id/complete", headers=user(),
                               json={"filename": "scan.mrd"})
    assert response.status_code == 400
    s3.assert_not_called()


def test_abort_deletes_only_the_callers_staged_object(client, user):
    s3 = staged_s3()
    s3.delete_object.side_effect = client_error()
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.post(f"/api/uploads/{OID}/abort", headers=user("sub-9"))
    assert response.status_code == 204
    s3.delete_object.assert_called_once_with(Bucket="test-bucket",
                                             Key=f"uploads/staging/sub-9/{OID}")


def test_the_multipart_upload_route_is_gone(client, user):
    assert client.post("/api/upload", headers=user()).status_code in (404, 405)


# --- delete -------------------------------------------------------------------

def test_delete_itemises_per_file_and_does_not_leak(client, user):
    db = mock.MagicMock()
    db.mrdfiles.delete_one.return_value = mock.Mock(deleted_count=1)
    s3 = mock.Mock()
    s3.delete_object.side_effect = client_error()

    def access(file_id, _sub):
        return {"fileName": "keep", "s3_key": "mrd_files/x"} if file_id == OID else None

    with mock.patch("app.mrds.routes.get_db", return_value=db), \
         mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.get_mrdfile_by_id_with_auth", side_effect=access):
        response = client.delete("/api/mrd-file", headers=user(),
                                 json={"ids": [OID, "507f1f77bcf86cd799439012"]})

    assert response.status_code == 200
    results = {r["file_id"]: r for r in response.get_json()["file_results"]}
    assert results[OID]["error"] == "Could not delete the file from storage"
    assert results[OID]["db_deleted"] is True
    assert results["507f1f77bcf86cd799439012"]["error"] == "File not found in database"
    assert "arn:aws" not in response.get_data(as_text=True)


# --- download and share -------------------------------------------------------

def test_download_is_501_not_a_crash(client, user):
    """The body was `pass` -- Flask raises when a view returns None."""
    response = client.get(f"/api/mrd-file/{OID}/download", headers=user())
    assert response.status_code == 501


def test_share_requires_a_body(client, user):
    assert client.post(f"/api/mrd-files/{OID}/share", headers=user()).status_code == 400


def test_share_refused_is_400(client, user):
    with mock.patch("app.mrds.routes.change_file_visibility", return_value=False):
        response = client.post(f"/api/mrd-files/{OID}/share", headers=user(), json={"groupName": "g"})
    assert response.status_code == 400


def test_share_null_string_means_private(client, user):
    with mock.patch("app.mrds.routes.change_file_visibility", return_value=True) as change:
        client.post(f"/api/mrd-files/{OID}/share", headers=user("sub-3"), json={"groupName": "null"})
    change.assert_called_once_with(OID, None, "sub-3")


# --- viewer -------------------------------------------------------------------

def test_missing_s3_object_is_404(client):
    with mock.patch("app.viewer.routes.get_public_mrdfile_by_id", return_value={"_id": 1}), \
         mock.patch("app.viewer.routes.get_image_array_from_mrdfile", side_effect=FileNotFoundError(OID)):
        assert client.get(f"/api/viewer/{OID}").status_code == 404


@pytest.mark.parametrize("message", ["Spectrum is displayed", f"No image data found in MRD file with id: {OID}"])
def test_unrenderable_file_is_422_with_its_message(client, message):
    """These are messages we wrote; the viewer shows them. They used to be 500s."""
    with mock.patch("app.viewer.routes.get_public_mrdfile_by_id", return_value={"_id": 1}), \
         mock.patch("app.viewer.routes.get_image_array_from_mrdfile", side_effect=ValueError(message)):
        response = client.get(f"/api/viewer/{OID}")
    assert response.status_code == 422
    assert response.get_json()["error"] == message


def test_pulse_array_with_no_pulses_is_empty_not_an_error(client):
    with mock.patch("app.viewer.routes.get_public_mrdfile_by_id", return_value={"_id": 1}), \
         mock.patch("app.viewer.routes.get_pulse_array_from_mrdfile", return_value=(None, None)):
        response = client.get(f"/api/viewer/get_pulse_array/{OID}")
    assert response.get_json() == {"pulse_data": [], "pulse_phase": []}


@pytest.mark.parametrize("magnet, target", [
    ("HUPC", "app.viewer.magnets.hupc_processing.count_datasets"),
    ("MR Solutions", "app.viewer.magnets.mr_solutions_processing.count_datasets"),
])
def test_magnet_dispatch(client, magnet, target):
    with mock.patch(target, return_value=4):
        assert client.get(f"/api/get_count_datasets/{magnet}").get_json() == {"numDatasets": 4}


def test_clinical_has_no_datasets(client):
    assert client.get("/api/get_count_datasets/Clinical").get_json() == {"numDatasets": 0}


def test_unknown_magnet_is_one_shared_400(client):
    responses = [
        client.get("/api/get_count_datasets/Fictional"),
        client.post("/api/get_proton_picture/1", json={"magnetType": "Fictional"}),
        client.post("/api/get_hp_mri_data/1?magnetType=Fictional"),
    ]
    assert all(r.status_code == 400 for r in responses)


# --- groups -------------------------------------------------------------------

def test_withdraw_join_request_works(client, user):
    """Regression: the route called a function it never imported (NameError)."""
    with mock.patch("app.groups.routes.withdraw_join_request", return_value=True):
        response = client.post("/api/groups/team-a/join-requests/withdraw", headers=user())
    assert response.status_code == 200


def test_group_errors_keep_their_message_and_drop_the_detail(client, user):
    with mock.patch("app.groups.routes.get_user_groups", side_effect=RuntimeError(SECRET)):
        response = client.get("/api/groups", headers=user())
    assert response.status_code == 500
    assert response.get_json() == {"error": "Failed to fetch groups"}
