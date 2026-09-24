"""
The error contract, and the authentication decorators around it.

The envelope tests are security assertions: the routes used to return str(e)
to callers. The requires_auth tests pin a defect fixed on this branch -- the
route ran inside the try that guards token decoding, so any exception from a
protected route came back as 401 "Authentication failed".
"""
from unittest import mock

import pytest
from pymongo.errors import ServerSelectionTimeoutError

from app.errors import ApiError, BadRequest, NotFound, StorageUnavailable

SECRET = "mongodb+srv://admin:hunter2@cluster.example.net"
OID = "507f1f77bcf86cd799439011"


def test_envelope_is_an_error_string_plus_a_code(client):
    """`error` must stay a string: the frontend displays it directly."""
    body = client.get("/api/get_count_datasets/Nonsense").get_json()
    assert set(body) == {"error", "code"}
    assert isinstance(body["error"], str)


def test_unexpected_exception_does_not_leak(client):
    with mock.patch("app.mrds.routes.list_public_mrdfiles", side_effect=RuntimeError(SECRET)):
        response = client.get("/api/mrd-files/public")
    assert response.status_code == 500
    assert "hunter2" not in response.get_data(as_text=True)
    assert response.get_json() == {"error": "An unexpected error occurred.", "code": "internal_error"}


def test_unexpected_exception_is_logged_with_traceback(client, caplog):
    with mock.patch("app.mrds.routes.list_public_mrdfiles", side_effect=RuntimeError("boom")):
        client.get("/api/mrd-files/public")
    assert any(r.exc_info for r in caplog.records)


def test_database_outage_is_503_not_an_empty_list(client):
    """The listings used to catch everything and return [] -- "you have no files"."""
    with mock.patch("data.get_db", side_effect=ServerSelectionTimeoutError("down")):
        response = client.get("/api/mrd-files/public")
    assert response.status_code == 503
    assert response.get_json()["code"] == "storage_unavailable"


def test_unknown_route_uses_the_envelope(client):
    assert set(client.get("/api/nope").get_json()) == {"error", "code"}


@pytest.mark.parametrize("exc, status, code", [
    (BadRequest("x"), 400, "bad_request"),
    (NotFound("x"), 404, "not_found"),
    (StorageUnavailable("x"), 503, "storage_unavailable"),
    (ApiError("x", code="teapot", status=418), 418, "teapot"),
])
def test_api_errors_map_to_their_status(app, client, exc, status, code):
    @app.route("/api/_boom")
    def _boom():
        raise exc

    response = client.get("/api/_boom")
    assert response.status_code == status
    assert response.get_json()["code"] == code


# --- requires_auth ------------------------------------------------------------

def test_protected_route_without_a_token_is_401(client):
    response = client.get("/api/mrd-files")
    assert response.status_code == 401
    assert response.get_json()["error"] == "Missing or invalid authorization header"


def test_invalid_token_is_401_without_detail(client):
    import jwt  # pylint: disable=import-outside-toplevel

    with mock.patch("app.auth._decode_token", side_effect=jwt.InvalidTokenError("sig mismatch")):
        response = client.get("/api/mrd-files", headers={"Authorization": "Bearer x"})
    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid token"}


def test_expired_token_says_so(client):
    import jwt  # pylint: disable=import-outside-toplevel

    with mock.patch("app.auth._decode_token", side_effect=jwt.ExpiredSignatureError()):
        response = client.get("/api/mrd-files", headers={"Authorization": "Bearer x"})
    assert response.status_code == 401
    assert response.get_json()["error"] == "Token has expired"


def test_route_errors_are_not_disguised_as_auth_failures(client, user):
    """
    Regression: the route used to run inside requires_auth's try, so a 400 or
    404 raised by the route -- or any bug -- came back as 401 "Authentication
    failed", which the SPA treats as being signed out.
    """
    response = client.delete("/api/mrd-file", headers=user(), json={"ids": []})
    assert response.status_code == 400
    assert response.get_json()["error"] == "No file IDs provided"


def test_a_bug_in_a_protected_route_is_a_500_not_a_401(client, user):
    with mock.patch("app.mrds.routes.list_mrdfiles_for_user", side_effect=RuntimeError("bug")):
        response = client.get("/api/mrd-files", headers=user())
    assert response.status_code == 500


def test_a_valid_token_reaches_the_route_as_that_user(client, user):
    with mock.patch("app.mrds.routes.list_mrdfiles_for_user", return_value=[]) as listed:
        client.get("/api/mrd-files", headers=user("sub-42"))
    assert listed.call_args.args[0] == "sub-42"


# --- optional_auth ------------------------------------------------------------

def test_guest_sees_only_public_files_in_the_viewer(client):
    with mock.patch("app.viewer.routes.get_public_mrdfile_by_id", return_value=None) as public, \
         mock.patch("app.viewer.routes.get_mrdfile_by_id_with_auth") as authed:
        response = client.get(f"/api/viewer/{OID}")
    assert response.status_code == 404
    public.assert_called_once_with(OID)
    authed.assert_not_called()


def test_signed_in_user_is_checked_against_their_own_access(client, user):
    with mock.patch("app.viewer.routes.get_mrdfile_by_id_with_auth", return_value=None) as authed:
        client.get(f"/api/viewer/{OID}", headers=user("sub-7"))
    authed.assert_called_once_with(OID, "sub-7")


def test_a_bad_token_on_an_optional_route_falls_back_to_guest(client):
    """optional_auth treats an invalid token as a guest, not an error."""
    with mock.patch("app.auth._decode_token", side_effect=ValueError("bad")), \
         mock.patch("app.viewer.routes.get_public_mrdfile_by_id", return_value=None) as public:
        response = client.get(f"/api/viewer/{OID}", headers={"Authorization": "Bearer junk"})
    assert response.status_code == 404
    public.assert_called_once()
