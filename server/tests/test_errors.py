"""
The error contract.

These are the tests that matter most: the old handlers returned `str(e)` to
callers on an API with no authentication, so "does a failure leak internals"
is a security assertion, not a style one.
"""
from unittest import mock

import pytest
from pymongo.errors import ServerSelectionTimeoutError

from app.errors import ApiError, BadRequest, NotFound, StorageUnavailable


def test_envelope_shape_is_error_string_plus_code(client):
    """
    `error` must stay a string: the frontend's getApiErrorMessage reads
    response.data.error directly and falls back to a generic axios message for
    any other shape.
    """
    response = client.get("/api/get_count_datasets/Nonsense")
    body = response.get_json()

    assert response.status_code == 400
    assert isinstance(body["error"], str)
    assert body["code"] == "bad_request"
    assert set(body) == {"error", "code"}


def test_unexpected_exception_does_not_leak_its_message(client):
    """An unhandled error must not hand internals to an anonymous caller."""
    secret = "mongodb+srv://admin:hunter2@cluster.example.net"

    with mock.patch("data._walk_mrd_arrays", side_effect=RuntimeError(secret)):
        response = client.get("/api/viewer/507f1f77bcf86cd799439011/arrays")

    body = response.get_json()
    assert response.status_code == 500
    assert "hunter2" not in str(body)
    assert "mongodb" not in str(body).lower()
    assert body == {"error": "An unexpected error occurred.", "code": "internal_error"}


def test_unexpected_exception_is_logged_with_traceback(client, caplog):
    with mock.patch("data._walk_mrd_arrays", side_effect=RuntimeError("boom")):
        client.get("/api/viewer/507f1f77bcf86cd799439011/arrays")

    assert any(r.exc_info for r in caplog.records), "traceback was not logged"


def test_database_outage_is_503_not_an_empty_list(client):
    """
    Regression test for the worst bug in the old code: list_all_mrdfiles caught
    everything and returned [], so an outage rendered as "you have no files".
    """
    with mock.patch("data.get_db", side_effect=ServerSelectionTimeoutError("no server")):
        response = client.get("/api/mrd-files")

    assert response.status_code == 503
    assert response.get_json()["code"] == "storage_unavailable"


def test_unknown_route_uses_the_same_envelope(client):
    body = client.get("/api/does-not-exist").get_json()
    assert set(body) == {"error", "code"}


@pytest.mark.parametrize(
    "exc, status, code",
    [
        (BadRequest("nope"), 400, "bad_request"),
        (NotFound("gone"), 404, "not_found"),
        (StorageUnavailable("down"), 503, "storage_unavailable"),
        (ApiError("teapot", code="teapot", status=418), 418, "teapot"),
    ],
)
def test_api_errors_map_to_their_status(app, client, exc, status, code):
    @app.route("/api/_boom")
    def _boom():
        raise exc

    response = client.get("/api/_boom")
    assert response.status_code == status
    assert response.get_json()["code"] == code
