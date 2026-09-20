"""
Cognito token validation.

The API currently has no authentication. Cognito is client-side only: the SPA
signs users in, then calls `/api/*` without an Authorization header, and the
backend never checks one. The only thing in front of the API is a CloudFront
Function comparing the `Referer` header against "medcap.ai", which a single
curl flag defeats -- see terraform/docs/INVENTORY.md, finding F1. Every
endpoint, including `DELETE /api/mrd-file`, is reachable by anyone.

This module closes that. It is wired up but **disabled by default**
(`REQUIRE_AUTH`, default false) because turning it on without the frontend
sending tokens would lock every researcher out. The rollout is:

  1. Merge this. Nothing changes; tokens are validated when present and
     ignored when absent.
  2. Ship the frontend interceptor that attaches the Cognito ID token.
  3. Confirm from the logs that real traffic is arriving authenticated.
  4. Set REQUIRE_AUTH=true in the task definition.

Step 3 is why `_ANONYMOUS` requests are logged distinctly: it is the evidence
that step 4 is safe.
"""
import functools
import logging
import time
from urllib.request import urlopen
import json

from flask import current_app, g, request

from app.errors import ApiError

logger = logging.getLogger(__name__)


class Unauthorized(ApiError):
    """No usable credentials were presented."""

    status = 401
    code = "unauthorized"


# Cognito rotates signing keys rarely, but a cached-forever JWKS would mean a
# rotation breaks every request until the task restarts.
_JWKS_TTL_SECONDS = 3600
_jwks_cache = {"fetched_at": 0.0, "keys": None, "url": None}


def _jwks_url():
    region = current_app.config["COGNITO_REGION"]
    pool_id = current_app.config["COGNITO_USER_POOL_ID"]
    return f"https://cognito-idp.{region}.amazonaws.com/{pool_id}/.well-known/jwks.json"


def _get_jwks(force_refresh=False):
    url = _jwks_url()
    fresh = time.time() - _jwks_cache["fetched_at"] < _JWKS_TTL_SECONDS

    if (
        not force_refresh
        and fresh
        and _jwks_cache["keys"] is not None
        and _jwks_cache["url"] == url
    ):
        return _jwks_cache["keys"]

    with urlopen(url, timeout=5) as response:  # noqa: S310 - fixed AWS host
        keys = json.loads(response.read())["keys"]

    _jwks_cache.update(fetched_at=time.time(), keys=keys, url=url)
    return keys


def _decode(token):
    """
    Verify a Cognito JWT and return its claims.

    Imported lazily so that a deployment which never enables REQUIRE_AUTH does
    not hard-depend on PyJWT being installed.
    """
    # pylint: disable=import-outside-toplevel
    import jwt
    from jwt import PyJWKClient  # noqa: F401  (imported for the error types below)

    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise Unauthorized("Malformed token.") from exc

    kid = header.get("kid")
    if not kid:
        raise Unauthorized("Token is missing a key id.")

    def _key_for(keys):
        for key in keys:
            if key["kid"] == kid:
                return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
        return None

    key = _key_for(_get_jwks())
    if key is None:
        # An unknown kid usually means a rotation, so refetch once before
        # concluding the token is bad.
        key = _key_for(_get_jwks(force_refresh=True))
    if key is None:
        raise Unauthorized("Token was signed by an unknown key.")

    try:
        claims = jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            issuer=current_app.config["COGNITO_ISSUER"],
            audience=current_app.config["COGNITO_CLIENT_ID"],
            options={"require": ["exp", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise Unauthorized("Session expired. Please sign in again.") from exc
    except jwt.PyJWTError as exc:
        # The detail belongs in the log, not in the response.
        logger.info("token rejected: %s", exc)
        raise Unauthorized("Invalid token.") from exc

    # An access token would pass every check above but carries no identity
    # claims, so reject it explicitly rather than ending up with a None user.
    if claims.get("token_use") != "id":
        raise Unauthorized("Expected an ID token.")

    return claims


def _bearer_token():
    header = request.headers.get("Authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def current_user():
    """The validated claims for this request, or None."""
    return getattr(g, "user", None)


def init_auth(app):
    """
    Validate a token whenever one is present, on every request.

    Running in before_request rather than per-route means `g.user` is populated
    for logging and ownership checks even while enforcement is off, which is
    what makes the staged rollout observable.
    """

    @app.before_request
    def _authenticate():  # pylint: disable=unused-variable
        g.user = None

        token = _bearer_token()
        if token is None:
            return

        # A bad token is rejected even when enforcement is off: presenting
        # credentials that do not verify is an error, not an anonymous request.
        g.user = _decode(token)


def require_auth(view):
    """
    Refuse the request unless a valid ID token was presented.

    Honours REQUIRE_AUTH so the decorator can be applied everywhere it belongs
    before enforcement is switched on.
    """

    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        if not current_app.config.get("REQUIRE_AUTH", False):
            if current_user() is None:
                # The line that tells you whether it is safe to enforce yet.
                logger.info(
                    "ANONYMOUS %s %s (REQUIRE_AUTH is off)",
                    request.method,
                    request.path,
                )
            return view(*args, **kwargs)

        if current_user() is None:
            raise Unauthorized("Authentication required.")

        return view(*args, **kwargs)

    return wrapper
