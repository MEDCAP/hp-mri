"""
Shared fixtures.

The magnet modules used to build boto3 clients -- and, in
mr_solutions_processing, list a bucket -- at module import time, so importing
the viewer blueprint reached for AWS. These fixtures had to stub all three
modules wholesale to get an app at all. That is fixed: S3 access is resolved on
first use, and `create_app()` now works with no credentials present.

What remains is patching MongoClient. It does not connect on construction, but
it does start background monitor threads, and there is no reason for a unit test
to have them.
"""
import os
import time
import uuid
from unittest import mock

import pytest
from bson import ObjectId


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGO_DB_NAME", "medcap_test")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")

    from app import create_app  # pylint: disable=import-outside-toplevel

    # Patched on the app package rather than on pymongo: `app` binds MongoClient
    # at import, so patching pymongo only works if this fixture happens to be
    # what imports it first, and the mock then leaks into every later db_app.
    with mock.patch("app.MongoClient"):
        application = create_app()

    application.config.update(
        TESTING=True,
        MONGO_DB_NAME="medcap_test",
        S3_BUCKET="test-bucket",
    )
    return application


@pytest.fixture()
def client(app):
    return app.test_client()


# --- integration against a real MongoDB -------------------------------------
#
# The fixtures above mock the database, which is right for testing routing,
# validation and error mapping but means the write path in data.py has no
# coverage at all. These two give tests a real server.
#
# Opt-in via MONGO_TEST_URI so `pytest` stays green on a machine with no
# MongoDB. CI always sets it -- see .github/workflows/ci.yml.
#
#   docker run --rm -d -p 27017:27017 --name hpmri-test-mongo mongo:7
#   MONGO_TEST_URI=mongodb://localhost:27017 pytest
#
# Deliberately a local server rather than an Atlas database: tests need to be
# fast, offline, and able to drop everything afterwards. Pointing them at a
# shared cluster would make them slow, flaky and capable of damaging real data.

@pytest.fixture(scope="session")
def mongo_uri():
    uri = os.getenv("MONGO_TEST_URI")
    if not uri:
        pytest.skip("set MONGO_TEST_URI to run database integration tests")
    return uri


@pytest.fixture()
def db_app(mongo_uri, monkeypatch):
    """
    An app wired to a real MongoDB, in a database unique to this test.

    Unique naming means tests cannot leak into one another, and the drop in
    teardown means a failed run does not poison the next one.
    """
    import pymongo  # pylint: disable=import-outside-toplevel

    db_name = f"hpmri_test_{uuid.uuid4().hex[:12]}"

    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("MONGO_URI", mongo_uri)
    monkeypatch.setenv("MONGO_DB_NAME", db_name)
    monkeypatch.setenv("S3_BUCKET", "test-bucket")

    from app import create_app  # pylint: disable=import-outside-toplevel

    application = create_app()
    application.config.update(TESTING=True, MONGO_DB_NAME=db_name,
                              S3_BUCKET="test-bucket")

    try:
        yield application
    finally:
        pymongo.MongoClient(mongo_uri).drop_database(db_name)


@pytest.fixture()
def db_client(db_app):
    return db_app.test_client()


# --- the pieces a job thread reaches for ------------------------------------

class FakeS3:
    """
    An S3 client holding its objects in dicts.

    `staged` is what the bucket already contains, `uploaded` what the code under
    test put there, and `deleted` the keys it removed.
    """

    def __init__(self):
        self.staged = {}
        self.uploaded = {}
        self.deleted = []

    def download_fileobj(self, _bucket, key, fileobj):
        fileobj.write(self.staged[key])

    def upload_fileobj(self, fileobj, _bucket, key):
        self.uploaded[key] = fileobj.read()

    def delete_object(self, Bucket=None, Key=None):  # noqa: N803  boto3's spelling
        self.deleted.append(Key)


@pytest.fixture()
def fake_s3(monkeypatch):
    """
    The client a job thread builds for itself.

    service._run_job makes its own boto3 session rather than sharing the
    process-wide client, so this is patched at the session rather than at
    data.get_s3_client.
    """
    s3 = FakeS3()
    session = mock.Mock()
    session.client.return_value = s3
    monkeypatch.setattr("boto3.session.Session", lambda *a, **kw: session)
    return s3


@pytest.fixture()
def await_job(db_app):
    """Wait for a job to leave `running`, and return the document."""

    def wait(job_id, timeout=5.0):
        with db_app.app_context():
            from data import get_db  # pylint: disable=import-outside-toplevel

            db = get_db()
            deadline = time.monotonic() + timeout
            while time.monotonic() < deadline:
                job = db.jobs.find_one({"_id": ObjectId(job_id)})
                if job and job["status"] in ("succeeded", "failed"):
                    return job
                time.sleep(0.01)
        raise AssertionError(f"job {job_id} never finished")

    return wait
