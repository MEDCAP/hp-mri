"""
JWT Authentication module for Cognito integration
"""
import json
import urllib.request
import jwt
from jwt import get_unverified_header, ExpiredSignatureError, InvalidTokenError
from flask import request, jsonify, g
from functools import wraps

# Cognito configuration
COGNITO_REGION = 'us-east-1'
USER_POOL_ID = 'us-east-1_vUo50ofKI'
AUDIENCE = '4nvgf7et9f4ui0glr4ddf152r8'  # Client ID
JWKS_URL = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'

# Cache JWKS (in production, consider caching with TTL)
try:
    jwks = json.loads(urllib.request.urlopen(JWKS_URL).read())
except Exception as e:
    print(f"Warning: Could not fetch JWKS: {e}")
    jwks = {"keys": []}

def requires_auth(f):
    """
    Decorator to require JWT authentication for routes
    Extracts user information from Cognito ID token and sets Flask g context
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ', 1)[1]
        
        try:
            # Get unverified header to find the key ID
            unverified_header = get_unverified_header(token)
            kid = unverified_header.get('kid')
            
            # Find the matching key
            key = None
            for k in jwks['keys']:
                if k['kid'] == kid:
                    key = k
                    break
            
            if not key:
                return jsonify({'error': 'Invalid token key'}), 401
            
            # Decode and verify the token
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            decoded = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                audience=AUDIENCE,
                issuer=f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}'
            )
            
            # Set user context
            g.user_sub = decoded.get('sub')
            g.user_email = decoded.get('email')
            g.user_name = decoded.get('name') or decoded.get('email')
            g.user_groups = decoded.get('cognito:groups', [])
            
            return f(*args, **kwargs)
            
        except ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except InvalidTokenError as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed', 'details': str(e)}), 401
    
    return wrapper

def optional_auth(f):
    """
    Like requires_auth but allows unauthenticated requests.
    Sets g.user_sub = None for guests; validates token if present.
    Routes using this decorator must check g.user_sub before accessing user-specific data.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        g.user_sub = None
        g.user_email = None
        g.user_name = None
        g.user_groups = []

        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
            try:
                unverified_header = get_unverified_header(token)
                kid = unverified_header.get('kid')
                key = next((k for k in jwks['keys'] if k['kid'] == kid), None)
                if key:
                    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
                    decoded = jwt.decode(
                        token,
                        public_key,
                        algorithms=['RS256'],
                        audience=AUDIENCE,
                        issuer=f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{USER_POOL_ID}'
                    )
                    g.user_sub = decoded.get('sub')
                    g.user_email = decoded.get('email')
                    g.user_name = decoded.get('name') or decoded.get('email')
                    g.user_groups = decoded.get('cognito:groups', [])
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

