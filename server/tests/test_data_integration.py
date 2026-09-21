"""
The write path, against a real MongoDB.

Everything else in this suite mocks the database, which is the right call for
routing and validation but leaves data.py's writes entirely unexercised --
insert, batch insert, delete, and the read-back shape the SPA depends on.

Run with:

    docker run --rm -d -p 27017:27017 --name hpmri-test-mongo mongo:7
    MONGO_TEST_URI=mongodb://localhost:27017 pytest

Skipped when MONGO_TEST_URI is unset. CI always sets it.

These use a throwaway database that is dropped in teardown -- never a shared
cluster. A test that can reach production data is a test that can destroy it.
"""
from datetime import datetime
from unittest import mock

import pytest
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

import data


def a_header(**overrides):
    header = {
        "fileName": "MID1-epsi",
        "studyDate": "20260101",
        "studyTime": "120000",
        "ownerName": "researcher@upenn.edu",
        "subjectType": "rat",
        "groupName": "public",
        "isReconstructed": False,
        "protocolName": "epsi",
        "measurementId": "1",
        "stationName": "HUPC",
        "original_filename": "scan.mrd",
        "upload_timestamp": datetime(2026, 1, 1, 12, 0, 0),
        "file_size": 2048,
    }
    header.update(overrides)
    return header


# --- insert -----------------------------------------------------------------

def test_insert_round_trips(db_app):
    with db_app.app_context():
        inserted = data.insert_mrdfile_header(a_header())
        found = data.get_mrdfile_by_id(str(inserted))

    assert found["fileName"] == "MID1-epsi"
    assert found["_id"] == inserted
    # A datetime must survive as a datetime, not a string: the SPA formats it.
    assert isinstance(found["upload_timestamp"], datetime)


def test_insert_honours_an_explicit_id(db_app):
    """
    The presigned upload mints the ObjectId before the document exists, so the
    S3 key can be derived from it. If insert ignored doc_id, the key and the
    _id would diverge and the file would be unreachable.
    """
    chosen = ObjectId()

    with db_app.app_context():
        inserted = data.insert_mrdfile_header(a_header(), doc_id=chosen)
        found = data.get_mrdfile_by_id(str(chosen))

    assert inserted == chosen
    assert found is not None


def test_reusing_an_id_is_refused(db_app):
    """A second complete call for the same upload must not overwrite the first."""
    chosen = ObjectId()

    with db_app.app_context():
        data.insert_mrdfile_header(a_header(), doc_id=chosen)
        with pytest.raises(DuplicateKeyError):
            data.insert_mrdfile_header(a_header(fileName="other"), doc_id=chosen)


@pytest.mark.parametrize("bad", [None, {}, [], "text", 0])
def test_insert_rejects_a_non_dict(db_app, bad):
    with db_app.app_context():
        with pytest.raises(ValueError):
            data.insert_mrdfile_header(bad)


def test_batch_insert(db_app):
    with db_app.app_context():
        ids = data.insert_mrdfiles_batch([a_header(fileName=f"f{i}") for i in range(3)])
        assert len(ids) == 3
        assert len(data.list_all_mrdfiles()) == 3


@pytest.mark.parametrize("empty", [None, [], {}, "text"])
def test_batch_insert_of_nothing_is_not_an_error(db_app, empty):
    with db_app.app_context():
        assert data.insert_mrdfiles_batch(empty) == []


# --- list -------------------------------------------------------------------

def test_list_sorts_newest_first_and_stringifies_ids(db_app):
    """
    The SPA renders _id directly and sorts by study date, so both are contract.
    """
    with db_app.app_context():
        data.insert_mrdfiles_batch([
            a_header(fileName="oldest", studyDate="20250101", studyTime="090000"),
            a_header(fileName="newest", studyDate="20260601", studyTime="090000"),
            a_header(fileName="middle", studyDate="20260101", studyTime="090000"),
        ])
        rows = data.list_all_mrdfiles()

    assert [r["fileName"] for r in rows] == ["newest", "middle", "oldest"]
    assert all(isinstance(r["_id"], str) for r in rows), "_id must be JSON-serializable"


def test_list_applies_the_projection(db_app):
    """
    The file table projects a subset. Shipping the whole document would hand the
    browser s3 keys and any parse_error text.
    """
    with db_app.app_context():
        data.insert_mrdfile_header(a_header(s3_key="mrd_files/secret"))
        rows = data.list_all_mrdfiles(projection={"fileName": 1, "_id": 1})

    assert set(rows[0]) == {"fileName", "_id"}


def test_list_of_an_empty_collection_is_empty(db_app):
    with db_app.app_context():
        assert data.list_all_mrdfiles() == []


# --- delete -----------------------------------------------------------------

def test_delete_removes_only_the_named_documents(db_app):
    with db_app.app_context():
        ids = data.insert_mrdfiles_batch([
            a_header(fileName="doomed"),
            a_header(fileName="spared"),
        ])

        removed = data.delete_mrdfiles_by_ids([str(ids[0])])
        remaining = data.list_all_mrdfiles()

    assert removed == 1
    assert [r["fileName"] for r in remaining] == ["spared"]


def test_deleting_something_absent_reports_zero(db_app):
    with db_app.app_context():
        assert data.delete_mrdfiles_by_ids([str(ObjectId())]) == 0


def test_delete_rejects_a_malformed_id(db_app):
    """
    InvalidId propagates so the shared handler can turn it into a 400. Silently
    skipping it would report a successful delete that never happened.
    """
    from bson.errors import InvalidId

    with db_app.app_context():
        with pytest.raises(InvalidId):
            data.delete_mrdfiles_by_ids(["not-an-objectid"])


# --- through the API --------------------------------------------------------

def test_upload_completion_writes_a_document_the_list_can_render(db_app, db_client):
    """
    The whole write path end to end: complete the upload, then confirm the row
    appears in the listing with the id the S3 key was derived from.
    """
    upload_id = ObjectId()
    s3 = mock.Mock()
    s3.head_object.return_value = {"ContentLength": 2048}
    s3.get_object.return_value = {"Body": mock.Mock(read=lambda: b"\x00")}

    with mock.patch("app.mrds.routes.get_s3_client", return_value=s3), \
         mock.patch("app.mrds.routes.read_mrdfile_header", return_value=a_header()):
        response = db_client.post(
            f"/api/uploads/{upload_id}/complete",
            json={"filename": "scan.mrd", "ownerName": "researcher@upenn.edu"},
        )

    assert response.status_code == 201
    assert response.get_json()["fileId"] == str(upload_id)

    listed = db_client.get("/api/mrd-files").get_json()
    assert [r["_id"] for r in listed] == [str(upload_id)]
    # The S3 key must be derivable from the id, or the file is unreachable.
    assert listed[0]["s3_key"] == f"mrd_files/{upload_id}"


def test_delete_endpoint_removes_the_document(db_app, db_client):
    with db_app.app_context():
        inserted = data.insert_mrdfile_header(a_header(s3_key="mrd_files/x"))

    with mock.patch("app.mrds.routes.get_s3_client"):
        response = db_client.delete("/api/mrd-file", json={"ids": [str(inserted)]})

    assert response.status_code == 200
    assert response.get_json()["deleted_count"] == 1
    assert db_client.get("/api/mrd-files").get_json() == []


def test_a_real_outage_surfaces_as_503_not_an_empty_list(db_app, db_client, mongo_uri):
    """
    The regression that matters most, exercised against a real client rather
    than a mock: an unreachable database must not read as "you have no files".
    """
    import pymongo  # pylint: disable=import-outside-toplevel

    broken = pymongo.MongoClient(
        "mongodb://127.0.0.1:1/", serverSelectionTimeoutMS=50
    )
    try:
        with mock.patch.object(db_app, "mongo_client", broken):
            response = db_client.get("/api/mrd-files")
    finally:
        # Left open, its monitor thread keeps logging after pytest closes the
        # capture stream, which buries the result in tracebacks.
        broken.close()

    assert response.status_code == 503
    assert response.get_json()["code"] == "storage_unavailable"
