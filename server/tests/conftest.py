"""
Shared fixtures.

Unit tests patch MongoClient -- it does not connect on construction, but it
starts background monitor threads no unit test needs -- and never touch AWS:
S3 access resolves on first use, so create_app() works with no credentials.

Authentication is exercised for real except for signature verification:
`user` patches app.auth._decode_token to return chosen claims, so requests
still go through requires_auth / optional_auth exactly as in production.
"""
import io
import os
import time
import uuid
from unittest import mock

import numpy as np
import pytest
from bson import ObjectId

# Set before any test module imports config: DevelopmentConfig picks its URI
# at import, and with AWS credentials in .env.development it would pick Atlas.
os.environ["MONGO_URI"] = os.getenv("MONGO_TEST_URI", "mongodb://localhost:27017")


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGO_DB_NAME", "medcap_test")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")

    # app/__init__ binds MongoClient at import, so patching pymongo.MongoClient
    # would only work the first time the package is imported.
    with mock.patch("app.MongoClient"):
        from app import create_app  # pylint: disable=import-outside-toplevel

        application = create_app()

    application.config.update(TESTING=True, MONGO_DB_NAME="medcap_test",
                              S3_BUCKET="test-bucket")
    return application


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def user():
    """
    Sign requests in as a user. Yields a callable returning auth headers, so a
    test can switch identity: `client.get(url, headers=user("sub-2"))`.
    """
    identity = {"sub": "user-1"}

    def decode(_token):
        return {"sub": identity["sub"], "email": f"{identity['sub']}@upenn.edu",
                "cognito:groups": []}

    def headers(sub="user-1"):
        identity["sub"] = sub
        return {"Authorization": f"Bearer token-for-{sub}"}

    with mock.patch("app.auth._decode_token", side_effect=decode):
        yield headers


# --- MRD files ----------------------------------------------------------------

def build_mrd_bytes():
    """
    A small MRD stream: two 4x4 magnitude images with two frequencies each
    (stacked into one image array of two measurements), and one waveform.
    The second image's values are 10x the first's, so scaling is visible.
    """
    import app.external.python.mrd as mrd  # pylint: disable=import-outside-toplevel

    def image(scale):
        data = np.arange(32, dtype=np.float32).reshape(1, 1, 4, 4, 2) * scale
        head = mrd.ImageHeader(image_type=mrd.ImageType.MAGNITUDE)
        return mrd.StreamItem.ImageFloat(mrd.ImageFloat(head=head, data=data))

    waveform = mrd.WaveformUint32(waveform_id=3, data=np.arange(10, dtype=np.uint32).reshape(1, 10))
    buffer = io.BytesIO()
    with mrd.BinaryMrdWriter(buffer) as writer:
        writer.write_header(mrd.Header())
        writer.write_data([image(1), image(10), mrd.StreamItem.WaveformUint32(waveform)])
    return buffer.getvalue()


@pytest.fixture()
def s3_object():
    """
    Serve bytes as every file's S3 object. Call it with the bytes to serve;
    the returned mock records which ids were fetched.
    """
    import data  # pylint: disable=import-outside-toplevel

    data._MRD_BYTES_CACHE.clear()  # pylint: disable=protected-access
    with mock.patch("data._get_mrd_object") as get_object:
        def serve(body=None, error=None):
            if error is not None:
                get_object.side_effect = error
            else:
                payload = build_mrd_bytes() if body is None else body
                get_object.side_effect = lambda _id: {"Body": io.BytesIO(payload)}
            return get_object
        yield serve
    data._MRD_BYTES_CACHE.clear()  # pylint: disable=protected-access


# --- integration against a real MongoDB -------------------------------------
#
# Opt-in via MONGO_TEST_URI so `pytest` stays green with no MongoDB installed;
# CI sets it against a mongo:7 service container.
#
#   docker compose -f ../docker-compose.test.yml up -d
#   MONGO_TEST_URI=mongodb://localhost:27017 pytest
#
# Never point MONGO_TEST_URI at Atlas. Each test creates a uniquely named
# database and drops it afterwards; aimed at a shared cluster that property is
# a liability rather than isolation.

@pytest.fixture(scope="session")
def mongo_uri():
    uri = os.getenv("MONGO_TEST_URI")
    if not uri:
        pytest.skip("set MONGO_TEST_URI to run database integration tests")
    return uri


@pytest.fixture()
def db_app(mongo_uri, monkeypatch):
    """An app wired to a real MongoDB, in a database unique to this test."""
    import pymongo  # pylint: disable=import-outside-toplevel

    db_name = f"hpmri_test_{uuid.uuid4().hex[:12]}"
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("MONGO_URI", mongo_uri)
    monkeypatch.setenv("MONGO_DB_NAME", db_name)
    monkeypatch.setenv("S3_BUCKET", "test-bucket")

    from app import create_app  # pylint: disable=import-outside-toplevel

    application = create_app()
    # The config class is built once per process, so a URI chosen before this
    # fixture ran (e.g. Atlas from AWS credentials) would otherwise stick.
    assert application.config["MONGO_URI"] == mongo_uri, \
        "the app is not using MONGO_TEST_URI; refusing to run against another server"
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
