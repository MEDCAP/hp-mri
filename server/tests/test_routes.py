"""File, viewer and group routes, with the data layer mocked."""
import io
import threading
import time
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

def upload(client, headers, files, group=None):
    data = {"ownerName": "Researcher", "file": files}
    if group is not None:
        data["groupName"] = group
    return client.post("/api/upload", headers=headers, data=data,
                       content_type="multipart/form-data")


def test_upload_requires_files_and_owner(client, user):
    assert client.post("/api/upload", headers=user(), data={}).status_code == 400
    response = client.post("/api/upload", headers=user(),
                           data={"file": (io.BytesIO(b"x"), "a.mrd")},
                           content_type="multipart/form-data")
    assert response.status_code == 400


def test_upload_rejects_a_bad_extension_per_file(client, user):
    response = upload(client, user(), [(io.BytesIO(b"x"), "notes.txt")])
    assert response.status_code == 400
    assert "not allowed" in response.get_json()["results"][0]["error"]


def test_upload_success_records_owner_and_group(client, user):
    s3 = mock.Mock()
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.read_mrdfile_header", return_value={"fileName": "f"}), \
         mock.patch("app.mrds.routes.insert_mrdfile_header", return_value=OID) as insert, \
         mock.patch("app.mrds.routes.get_db"):
        response = upload(client, user("sub-9"), [(io.BytesIO(b"x"), "scan.mrd")], group="team-a")

    assert response.status_code == 200
    doc = insert.call_args.args[0]
    assert doc["ownerId"] == "sub-9" and doc["groupName"] == "team-a"
    s3.upload_file.assert_called_once()
    assert s3.upload_file.call_args.args[2] == f"mrd_files/{OID}"


def test_upload_partial_failure_is_207_and_does_not_leak(client, user):
    """One file failing must not sink the batch, and must not ship botocore text."""
    s3 = mock.Mock()
    s3.upload_file.side_effect = [None, client_error()]
    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.read_mrdfile_header", return_value={"fileName": "f"}), \
         mock.patch("app.mrds.routes.insert_mrdfile_header", side_effect=[OID, OID]), \
         mock.patch("app.mrds.routes.get_db"):
        response = upload(client, user(), [(io.BytesIO(b"a"), "a.mrd"), (io.BytesIO(b"b"), "b.mrd")])

    assert response.status_code == 207
    body = response.get_data(as_text=True)
    assert "arn:aws" not in body
    statuses = [r["status"] for r in response.get_json()["results"]]
    assert statuses == ["completed", "error"]


def test_upload_takes_no_artificial_delay(client, user):
    """
    The fake-progress time.sleep() calls cost 0.9-1.6 s per file. They were a
    local `import time` inside the loop, so only a patch on time.sleep itself
    can see them -- filtered to this thread, because pymongo's background
    monitors sleep constantly.
    """
    request_thread = threading.get_ident()
    slept = []
    real_sleep = time.sleep

    def spy(seconds):
        if threading.get_ident() == request_thread:
            slept.append(seconds)
            return None
        return real_sleep(seconds)

    with mock.patch("time.sleep", side_effect=spy), \
         mock.patch("app.mrds.routes.get_s3_client"), \
         mock.patch("app.mrds.routes.read_mrdfile_header", return_value={"fileName": "f"}), \
         mock.patch("app.mrds.routes.insert_mrdfile_header", return_value=OID), \
         mock.patch("app.mrds.routes.get_db"):
        upload(client, user(), [(io.BytesIO(b"x"), "scan.mrd")])
    assert slept == []


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
