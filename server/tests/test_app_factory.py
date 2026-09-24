"""
create_app() itself.

Every case here was a real defect: the app could not start without AWS
credentials, an unrecognised FLASK_ENV loaded no configuration at all, and
production ran with no CORS middleware.
"""
import importlib
import sys
from unittest import mock

import pytest


@pytest.fixture(autouse=True)
def _restore_modules():
    """
    Undo the reimporting `build` does.

    Without this the rest of the suite ends up holding classes from a discarded
    copy of app.errors, so `except ApiError` stops matching and every handled
    error becomes a 500.
    """
    snapshot = dict(sys.modules)
    yield
    for name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[name]
    sys.modules.update(
        {k: v for k, v in snapshot.items() if k == "app" or k.startswith("app.")}
    )
    importlib.reload(sys.modules["config"])


def build(monkeypatch, **env):
    """
    Build an app with a given environment.

    config.py reads os.getenv at class-definition time, so the module has to be
    reloaded after the environment changes -- setting a variable afterwards
    would otherwise have no effect. app.* is dropped too, because app/__init__
    binds the config classes at import. In production nothing reloads anything:
    ECS sets the environment before the process starts.
    """
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    import config  # pylint: disable=import-outside-toplevel

    importlib.reload(config)
    for name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[name]

    with mock.patch("pymongo.MongoClient"):
        from app import create_app  # pylint: disable=import-outside-toplevel

        return create_app()


def test_starts_without_aws_credentials(monkeypatch):
    """
    The magnet modules used to build boto3 clients -- and list a bucket -- at
    import time, so importing the viewer blueprint reached for AWS and
    create_app() failed outright without live credentials.
    """
    for key in (
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_SESSION_TOKEN",
        "AWS_PROFILE",
    ):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("AWS_EC2_METADATA_DISABLED", "true")
    monkeypatch.setenv("AWS_SHARED_CREDENTIALS_FILE", "/dev/null")
    monkeypatch.setenv("AWS_CONFIG_FILE", "/dev/null")

    app = build(monkeypatch, FLASK_ENV="development", MONGO_URI="mongodb://x")

    assert any(str(r).startswith("/api/viewer") for r in app.url_map.iter_rules())


def test_unknown_flask_env_fails_loudly(monkeypatch):
    """
    It used to fall through both branches, load no config, and die later on a
    bare KeyError from the first config lookup.
    """
    with pytest.raises(RuntimeError, match="FLASK_ENV"):
        build(monkeypatch, FLASK_ENV="staging", MONGO_URI="mongodb://x")


def test_cors_is_initialised_in_production(monkeypatch):
    """
    CORS() used to be called only inside the development branch, and
    ProductionConfig defined no origins, so production had no CORS middleware
    at all. Latent while CloudFront keeps the SPA and API same-origin; fatal the
    moment the API moves to its own hostname.
    """
    app = build(
        monkeypatch,
        FLASK_ENV="production",
        MONGO_URI="mongodb://x",
        CORS_ORIGINS="https://medcap.ai,https://medcap-dev.medcap.ai",
    )

    assert app.config["CORS_ORIGINS"] == [
        "https://medcap.ai",
        "https://medcap-dev.medcap.ai",
    ]
    response = app.test_client().get(
        "/api/health", headers={"Origin": "https://medcap.ai"}
    )
    assert response.headers.get("Access-Control-Allow-Origin") == "https://medcap.ai"


def test_production_rejects_an_unlisted_origin(monkeypatch):
    app = build(
        monkeypatch,
        FLASK_ENV="production",
        MONGO_URI="mongodb://x",
        CORS_ORIGINS="https://medcap.ai",
    )
    response = app.test_client().get(
        "/api/health", headers={"Origin": "https://evil.example.com"}
    )
    assert "Access-Control-Allow-Origin" not in response.headers


def test_development_keeps_its_localhost_defaults(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    app = build(monkeypatch, FLASK_ENV="development", MONGO_URI="mongodb://x")
    assert "http://localhost:5173" in app.config["CORS_ORIGINS"]


def test_config_is_environment_driven(monkeypatch):
    app = build(
        monkeypatch,
        FLASK_ENV="development",
        MONGO_URI="mongodb://x",
        MONGO_DB_NAME="hpmri_dev",
        S3_BUCKET="medcap-data-dev",
    )
    # Both were hardcoded until recently -- the DB name as a function default.
    assert app.config["MONGO_DB_NAME"] == "hpmri_dev"
    assert app.config["S3_BUCKET"] == "medcap-data-dev"


def test_database_default_is_still_production(monkeypatch):
    """
    Deliberate, and temporary. The live task definition sets no environment
    variables, so MONGO_DB_NAME must default to the database production uses --
    "medcap_dev", despite the name -- or the next deploy points production at an
    empty database. Flip the default to "hpmri_dev" (and this test with it) only
    once the Terraform task definition sets MONGO_DB_NAME explicitly and the
    rename to hpmri_prod is done. See terraform/README.md.
    """
    monkeypatch.delenv("MONGO_DB_NAME", raising=False)
    app = build(monkeypatch, FLASK_ENV="production", MONGO_URI="mongodb://x")
    assert app.config["MONGO_DB_NAME"] == "medcap_dev"
