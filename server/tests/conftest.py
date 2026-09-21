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
import uuid
from unittest import mock

import pytest


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGO_DB_NAME", "medcap_test")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")

    with mock.patch("pymongo.MongoClient"):
        from app import create_app  # pylint: disable=import-outside-toplevel

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
