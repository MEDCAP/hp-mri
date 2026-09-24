"""
Shared fixtures.

Unit tests patch MongoClient -- it does not connect on construction, but it
starts background monitor threads no unit test needs -- and never touch AWS:
S3 access resolves on first use, so create_app() works with no credentials.

Authentication is exercised for real except for signature verification:
`user` patches app.auth._decode_token to return chosen claims, so requests
still go through requires_auth / optional_auth exactly as in production.
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
    application.config.update(TESTING=True, MONGO_DB_NAME=db_name,
                              S3_BUCKET="test-bucket")
    try:
        yield application
    finally:
        pymongo.MongoClient(mongo_uri).drop_database(db_name)


@pytest.fixture()
def db_client(db_app):
    return db_app.test_client()
