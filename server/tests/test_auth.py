"""
Token validation.

These tests exist to make the staged rollout safe. Two properties matter:
with REQUIRE_AUTH off nothing changes for existing callers, and with it on the
endpoints that touch the group's data are genuinely closed.

Tokens are minted here with a throwaway RSA key and the JWKS fetch is patched,
so nothing talks to Cognito.
"""
import json
import time
from unittest import mock

import pytest

jwt = pytest.importorskip("jwt", reason="PyJWT is only needed when auth is enabled")
from cryptography.hazmat.primitives.asymmetric import rsa  # noqa: E402

from app.auth import Unauthorized  # noqa: E402

POOL_ID = "us-east-1_vUo50ofKI"
CLIENT_ID = "4nvgf7et9f4ui0glr4ddf152r8"
ISSUER = f"https://cognito-idp.us-east-1.amazonaws.com/{POOL_ID}"
KID = "test-key-1"
OID = "507f1f77bcf86cd799439011"


@pytest.fixture(scope="module")
def keypair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(key.public_key()))
    jwk.update(kid=KID, use="sig", alg="RS256")
    return key, jwk


@pytest.fixture(autouse=True)
def _no_network(keypair):
    """Serve the local public key instead of reaching for Cognito's JWKS."""
    _, jwk = keypair
    with mock.patch("app.auth._get_jwks", return_value=[jwk]):
        yield


def make_token(keypair, **overrides):
    key, _ = keypair
    claims = {
        "sub": "8a1f-user",
        "email": "researcher@upenn.edu",
        "token_use": "id",
        "iss": ISSUER,
        "aud": CLIENT_ID,
        "exp": int(time.time()) + 3600,
        "iat": int(time.time()),
    }
    claims.update(overrides)
    return jwt.encode(claims, key, algorithm="RS256", headers={"kid": KID})


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# --- enforcement off (today's behaviour) ------------------------------------

def test_anonymous_requests_still_work_while_disabled(client):
    """
    The whole point of the flag. Merging this must not lock anyone out before
    the frontend sends tokens.
    """
    with mock.patch("app.mrds.routes.list_all_mrdfiles", return_value=[]):
        assert client.get("/api/mrd-files").status_code == 200


def test_anonymous_access_is_logged_so_the_rollout_is_observable(client, caplog):
    with mock.patch("app.mrds.routes.list_all_mrdfiles", return_value=[]):
        client.get("/api/mrd-files")

    assert any("ANONYMOUS" in r.getMessage() for r in caplog.records)


def test_a_bad_token_is_rejected_even_while_disabled(client):
    """
    Presenting credentials that do not verify is an error, not an anonymous
    request -- otherwise a typo'd token would silently downgrade to no auth.
    """
    response = client.get("/api/mrd-files", headers=auth("not-a-jwt"))
    assert response.status_code == 401
    assert response.get_json()["code"] == "unauthorized"


def test_a_valid_token_populates_the_user_while_disabled(app, client, keypair):
    seen = {}

    @app.route("/api/_whoami")
    def _whoami():
        from app.auth import current_user  # pylint: disable=import-outside-toplevel
        seen["user"] = current_user()
        return {"ok": True}

    client.get("/api/_whoami", headers=auth(make_token(keypair)))
    assert seen["user"]["email"] == "researcher@upenn.edu"


# --- enforcement on ---------------------------------------------------------

@pytest.fixture()
def strict(app):
    app.config["REQUIRE_AUTH"] = True
    return app


def test_anonymous_is_refused_when_enforcing(strict, client):
    response = client.get("/api/mrd-files")
    assert response.status_code == 401
    assert response.get_json()["error"] == "Authentication required."


@pytest.mark.parametrize(
    "path, method, kwargs",
    [
        ("/api/mrd-files", "get", {}),
        (f"/api/mrd-files/{OID}", "get", {}),
        ("/api/uploads/init", "post", {"json": {}}),
        (f"/api/uploads/{OID}/complete", "post", {"json": {}}),
        (f"/api/uploads/{OID}/abort", "post", {}),
        ("/api/mrd-file", "delete", {"json": {"ids": [OID]}}),
        (f"/api/mrd-file/{OID}/download", "get", {}),
        (f"/api/viewer/{OID}/arrays", "get", {}),
        (f"/api/viewer/{OID}/arrays/image_0", "get", {}),
        ("/api/recon", "post", {"json": {}}),
    ],
)
def test_every_data_route_is_closed_when_enforcing(strict, client, path, method, kwargs):
    """
    The important one. DELETE /api/mrd-file in particular is currently
    reachable by anyone who sets a Referer header.
    """
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 401, f"{method.upper()} {path} was not protected"


def test_health_stays_open_when_enforcing(strict, client):
    """The ALB health check cannot present a token."""
    assert client.get("/api/health").status_code == 200


def test_a_valid_token_is_accepted_when_enforcing(strict, client, keypair):
    with mock.patch("app.mrds.routes.list_all_mrdfiles", return_value=[]):
        response = client.get("/api/mrd-files", headers=auth(make_token(keypair)))
    assert response.status_code == 200


# --- what must be refused ---------------------------------------------------

def test_expired_token(strict, client, keypair):
    token = make_token(keypair, exp=int(time.time()) - 60)
    response = client.get("/api/mrd-files", headers=auth(token))
    assert response.status_code == 401
    assert "expired" in response.get_json()["error"].lower()


def test_token_for_another_client(strict, client, keypair):
    token = make_token(keypair, aud="some-other-app")
    assert client.get("/api/mrd-files", headers=auth(token)).status_code == 401


def test_token_from_another_pool(strict, client, keypair):
    token = make_token(keypair, iss="https://cognito-idp.us-east-1.amazonaws.com/us-east-1_EVIL")
    assert client.get("/api/mrd-files", headers=auth(token)).status_code == 401


def test_access_token_is_not_an_id_token(strict, client, keypair):
    """
    An access token passes signature, issuer and expiry but carries no identity
    claims, so accepting one would leave the user unidentified.
    """
    token = make_token(keypair, token_use="access")
    response = client.get("/api/mrd-files", headers=auth(token))
    assert response.status_code == 401
    assert "ID token" in response.get_json()["error"]


def test_token_signed_by_an_unknown_key(strict, client, keypair):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    token = jwt.encode(
        {
            "sub": "x", "token_use": "id", "iss": ISSUER, "aud": CLIENT_ID,
            "exp": int(time.time()) + 3600,
        },
        other,
        algorithm="RS256",
        headers={"kid": "unknown-kid"},
    )
    assert client.get("/api/mrd-files", headers=auth(token)).status_code == 401


def test_unsigned_token_is_refused(strict, client):
    """
    The classic JWT attack: alg=none. jwt.decode is pinned to RS256, so this
    never reaches signature verification.
    """
    token = jwt.encode(
        {"sub": "x", "token_use": "id", "iss": ISSUER, "aud": CLIENT_ID,
         "exp": int(time.time()) + 3600},
        key="",
        algorithm="none",
    )
    assert client.get("/api/mrd-files", headers=auth(token)).status_code == 401


@pytest.mark.parametrize("header", ["", "Bearer", "Bearer    ", "Basic abc123", "token abc"])
def test_malformed_authorization_headers_are_treated_as_anonymous(strict, client, header):
    response = client.get("/api/mrd-files", headers={"Authorization": header})
    # Anonymous, not malformed-credential: these never reach _decode.
    assert response.status_code == 401
    assert response.get_json()["error"] == "Authentication required."


def test_error_body_does_not_echo_the_token(strict, client, keypair):
    token = make_token(keypair, exp=int(time.time()) - 60)
    body = str(client.get("/api/mrd-files", headers=auth(token)).get_json())
    assert token[:20] not in body


def test_unauthorized_is_an_api_error():
    assert Unauthorized("x").status == 401
