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
