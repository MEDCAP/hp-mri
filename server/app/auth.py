"""
JWT Authentication module for Cognito integration
"""
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWKClient
from flask import request, jsonify, g
from functools import wraps

# Cognito configuration
COGNITO_REGION = 'us-east-1'
USER_POOL_ID = 'us-east-1_vUo50ofKI'
AUDIENCE = '4nvgf7et9f4ui0glr4ddf152r8'  # Client ID
JWKS_URL = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'

# PyJWT 2.10+ JWKS client (fetches and caches keys; requires cryptography for RS256)
try:
    jwks_client = PyJWKClient(JWKS_URL, cache_jwk_set=True, lifespan=3600)
except Exception as e:
    jwks_client = None
    print(f"Warning: Could not create JWKS client: {e}")


def _decode_token(token: str):
    """Get signing key from JWKS and decode/verify token. Raises on failure."""
    if not jwks_client:
        raise RuntimeError("JWKS client not available")
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=AUDIENCE,
        issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}",
    )


def requires_auth(f):
    """
    Decorator to require JWT authentication for routes
    Extracts user information from Cognito ID token and sets Flask g context
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401

        token = auth_header.split(" ", 1)[1]

        try:
            decoded = _decode_token(token)
            g.user_sub = decoded.get("sub")
            g.user_email = decoded.get("email")
            g.user_name = decoded.get("name") or decoded.get("email")
            g.user_groups = decoded.get("cognito:groups", [])
            return f(*args, **kwargs)

        except ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except InvalidTokenError as e:
            return jsonify({"error": "Invalid token", "details": str(e)}), 401
        except Exception as e:
            return jsonify({"error": "Authentication failed", "details": str(e)}), 401

    return wrapper


def optional_auth(f):
    """
    Like requires_auth but allows unauthenticated requests.
    Sets g.user_sub = None for guests; validates token if present.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        g.user_sub = None
        g.user_email = None
        g.user_name = None
        g.user_groups = []

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                decoded = _decode_token(token)
                g.user_sub = decoded.get("sub")
                g.user_email = decoded.get("email")
                g.user_name = decoded.get("name") or decoded.get("email")
                g.user_groups = decoded.get("cognito:groups", [])
            except Exception:
                pass  # Invalid or expired token — treat as guest

        return f(*args, **kwargs)

    return wrapper

def get_current_user():
    """
    Get current user information from Flask g context
    Returns dict with user info or None if not authenticated
    """
    if not hasattr(g, 'user_sub'):
        return None
    
    return {
        'sub': g.user_sub,
        'email': g.user_email,
        'name': g.user_name,
        'groups': g.user_groups
    }

