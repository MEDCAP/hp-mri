"""File metadata routes, the array discovery pair, and magnet dispatch."""
from unittest import mock

import pytest
from botocore.exceptions import ClientError
from pymongo.errors import PyMongoError

OID = "507f1f77bcf86cd799439011"


def test_list_files_passes_a_projection_and_returns_the_rows(client):
    rows = [{"_id": OID, "fileName": "MID1-proto"}]
    with mock.patch("app.mrds.routes.list_all_mrdfiles", return_value=rows) as listed:
        response = client.get("/api/mrd-files")

    assert response.status_code == 200
    assert response.get_json() == rows
    # Listing the whole document would ship s3 keys and parse errors to the table view.
    assert "fileName" in listed.call_args.kwargs["projection"]


def test_get_file_404s_for_a_well_formed_id_that_matches_nothing(client):
    with mock.patch("app.mrds.routes.get_mrdfile_by_id", return_value=None):
        response = client.get(f"/api/mrd-files/{OID}")

    assert response.status_code == 404
    assert response.get_json()["code"] == "not_found"


def test_get_file_400s_for_an_unparseable_id(client):
    """InvalidId is translated centrally, so the route needs no try/except."""
    from bson.errors import InvalidId

    with mock.patch("app.mrds.routes.get_mrdfile_by_id", side_effect=InvalidId("bad")):
        response = client.get("/api/mrd-files/nonsense")

    assert response.status_code == 400
    assert response.get_json()["code"] == "bad_request"


def test_delete_requires_ids(client):
    assert client.delete("/api/mrd-file", json={"ids": []}).status_code == 400
    assert client.delete("/api/mrd-file", json={}).status_code == 400


def test_delete_reports_per_file_outcomes_rather_than_failing_the_batch(client):
    """
    A partial delete is a real outcome the client needs itemised. One bad id
    must not cost the caller the results for the good ones.
    """
    good, missing = OID, "507f1f77bcf86cd799439012"
    db = mock.MagicMock()
    db.mrdfiles.find_one.side_effect = lambda q: (
        {"fileName": "keep.mrd", "s3_key": f"mrd_files/{good}"}
        if str(q["_id"]) == good else None
    )
    db.mrdfiles.delete_one.return_value = mock.Mock(deleted_count=1)

    with mock.patch("app.mrds.routes.get_db", return_value=db), \
         mock.patch("app.mrds.routes.get_s3_client"):
        response = client.delete(
            "/api/mrd-file", json={"ids": [good, missing, "not-an-oid"]}
        )

    body = response.get_json()
    assert response.status_code == 200
    assert body["deleted_count"] == 1

    by_id = {r["file_id"]: r for r in body["file_results"]}
    assert by_id[good]["status"] == "success"
    assert by_id[good]["db_deleted"] and by_id[good]["s3_deleted"]
    assert by_id[missing]["error"] == "File not found in database"
    assert by_id["not-an-oid"]["error"] == "Invalid file ID"


def test_delete_does_not_leak_botocore_text_on_s3_failure(client):
    db = mock.MagicMock()
    db.mrdfiles.find_one.return_value = {"fileName": "x.mrd", "s3_key": "mrd_files/x"}
    db.mrdfiles.delete_one.return_value = mock.Mock(deleted_count=1)

    s3 = mock.Mock()
    s3.delete_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "arn:aws:iam::862065604168:role/secret"}},
        "DeleteObject",
    )

    with mock.patch("app.mrds.routes.get_db", return_value=db), \
         mock.patch("app.mrds.routes.get_s3_client", return_value=s3):
        response = client.delete("/api/mrd-file", json={"ids": [OID]})

    result = response.get_json()["file_results"][0]
    assert result["status"] == "error"
    assert "arn:aws:iam" not in result["error"]
    assert result["error"] == "Could not delete the file from storage"


def test_delete_records_a_mongo_failure_without_losing_the_s3_result(client):
    db = mock.MagicMock()
    db.mrdfiles.find_one.return_value = {"fileName": "x.mrd", "s3_key": "mrd_files/x"}
    db.mrdfiles.delete_one.side_effect = PyMongoError("replica set down")

    with mock.patch("app.mrds.routes.get_db", return_value=db), \
         mock.patch("app.mrds.routes.get_s3_client"):
        response = client.delete("/api/mrd-file", json={"ids": [OID]})

    result = response.get_json()["file_results"][0]
    assert result["s3_deleted"] is True
    assert result["db_deleted"] is False
    assert "replica set" not in result["error"]


def test_download_is_honestly_not_implemented(client):
    """
    The route previously declared <int:file_id>, so it could never have matched a
    real ObjectId. It takes a string now and says 501 rather than returning an
    empty 200.
    """
    response = client.get(f"/api/mrd-file/{OID}/download")
    assert response.status_code == 501
    assert response.get_json()["code"] == "not_implemented"


def test_recon_is_registered_and_reports_501(client):
    """Registered so it reports its status, instead of 404ing as if unknown."""
    response = client.post("/api/recon", json={})
    assert response.status_code == 501
    assert response.get_json()["code"] == "not_implemented"


def test_health_reports_the_mode(client):
    body = client.get("/api/health").get_json()
    assert body["mode"] == "development"


# --- viewer ----------------------------------------------------------------

def test_array_list_returns_descriptors_and_unsupported(client):
    with mock.patch("app.viewer.routes.list_mrd_arrays",
                    return_value=([{"key": "image_0"}], [{"tag": "acquisition", "count": 9}])):
        body = client.get(f"/api/viewer/{OID}/arrays").get_json()

    assert body["file_id"] == OID
    assert body["arrays"] == [{"key": "image_0"}]
    assert body["unsupported"] == [{"tag": "acquisition", "count": 9}]


def test_missing_object_is_404(client):
    with mock.patch("app.viewer.routes.list_mrd_arrays", side_effect=FileNotFoundError(OID)):
        response = client.get(f"/api/viewer/{OID}/arrays")
    assert response.status_code == 404


def test_unknown_array_key_is_404_not_500(client):
    """
    get_mrd_array raises KeyError for an unknown key. A bare KeyError elsewhere
    is a defect, so it is translated at the one place that can tell them apart.
    """
    with mock.patch("app.viewer.routes.get_mrd_array", side_effect=KeyError("nope")):
        response = client.get(f"/api/viewer/{OID}/arrays/nope")

    assert response.status_code == 404
    assert "nope" in response.get_json()["error"]


@pytest.mark.parametrize("magnet", ["HUPC", "Clinical", "MR Solutions"])
def test_known_magnets_dispatch(client, magnet):
    response = client.get(f"/api/get_count_datasets/{magnet}")
    assert response.status_code == 200
    assert "numDatasets" in response.get_json()


def test_unknown_magnet_is_one_shared_400_on_every_route(client):
    """This 400 used to be spelled out at the end of four separate chains."""
    responses = [
        client.get("/api/get_count_datasets/Fictional"),
        client.post("/api/get_proton_picture/1", json={"magnetType": "Fictional"}),
        client.post("/api/get_hp_mri_data/1?magnetType=Fictional"),
    ]

    for response in responses:
        assert response.status_code == 400
        assert response.get_json()["error"] == "Invalid magnet type: Fictional"
