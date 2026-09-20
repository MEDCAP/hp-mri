"""
Shared fixtures.

Two things make this app awkward to test, and both are worked around here
rather than papered over:

1. `app/viewer/magnets/*` construct boto3 clients and, in the case of
   mr_solutions_processing, call `list_objects_v2` **at module import time**.
   Importing the viewer blueprint therefore hits S3, so `create_app()` fails
   outright without live credentials. The `_stub_magnets` fixture replaces those
   modules before the app is imported. This is a real defect (see
   terraform/docs/INVENTORY.md), not a testing inconvenience — when it is fixed,
   delete the stub.

2. `create_app()` constructs a MongoClient eagerly. MongoClient does not connect
   on construction, but it does start background monitor threads, so it is
   patched out.
"""
import sys
import types
from unittest import mock

import pytest


@pytest.fixture(scope="session", autouse=True)
def _stub_magnets():
    """Replace the magnet modules before anything imports the viewer blueprint."""
    names = ("hupc_processing", "clinical_processing", "mr_solutions_processing")
    for name in names:
        module = types.ModuleType(f"app.viewer.magnets.{name}")
        module.count_datasets = lambda: 7
        module.process_proton_picture = lambda slider, data: ({"proton": slider}, 200)
        module.process_hp_mri_data = lambda dataset, threshold: (
            {"dataset": dataset, "threshold": threshold},
            200,
        )
        module.process_hpmri_data = module.process_hp_mri_data
        sys.modules[f"app.viewer.magnets.{name}"] = module

    package = types.ModuleType("app.viewer.magnets")
    for name in names:
        setattr(package, name, sys.modules[f"app.viewer.magnets.{name}"])
    sys.modules["app.viewer.magnets"] = package
    yield


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "development")
    monkeypatch.setenv("MONGO_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGO_DB_NAME", "medcap_test")
    monkeypatch.setenv("S3_BUCKET", "test-bucket")

    with mock.patch("pymongo.MongoClient"):
        from app import create_app

        application = create_app()

    application.config.update(TESTING=True, MONGO_DB_NAME="medcap_test",
                              S3_BUCKET="test-bucket")
    return application


@pytest.fixture()
def client(app):
    return app.test_client()
