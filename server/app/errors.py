"""
Domain exceptions and the application's single error envelope.

Route handlers raise; they do not format. Every failure leaves the API as

    {"error": "<safe, human-readable message>", "code": "<machine tag>"}

which is what `hp-mri-frontend/src/api/client.ts::getApiErrorMessage` reads.

The rule that matters: an unexpected exception is logged in full, server-side,
and the client is told only that something went wrong. Returning `str(e)` to the
caller — as every handler used to — leaks Mongo URIs, S3 keys and internal paths
to anyone, and the API has no authentication in front of it.
"""
import logging

from bson.errors import InvalidId
from botocore.exceptions import BotoCoreError, ClientError
from flask import jsonify
from pymongo.errors import PyMongoError
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Base for failures that carry a safe, client-visible message."""

    status = 500
    code = "internal_error"

    def __init__(self, message=None, code=None, status=None):
        super().__init__(message or self.__class__.__doc__)
        self.message = message or "Something went wrong."
        if code is not None:
            self.code = code
        if status is not None:
            self.status = status


class BadRequest(ApiError):
    """The request was malformed or failed validation."""

    status = 400
    code = "bad_request"


class NotFound(ApiError):
    """The requested resource does not exist."""

    status = 404
    code = "not_found"


class StorageUnavailable(ApiError):
    """A backing store (MongoDB or S3) could not be reached."""

    status = 503
    code = "storage_unavailable"


def _envelope(message, code, status):
    return jsonify({"error": message, "code": code}), status


def register_error_handlers(app):
    """
    Install the handlers that turn exceptions into the envelope above.

    Ordering note: Flask dispatches to the most specific registered class, so
    the `Exception` catch-all below only sees what the others did not claim.
    """

    @app.errorhandler(ApiError)
    def _handle_api_error(exc):
        # Expected, already-safe failures. Logged at info: they are not defects.
        logger.info("%s: %s", exc.code, exc.message)
        return _envelope(exc.message, exc.code, exc.status)

    @app.errorhandler(FileNotFoundError)
    def _handle_missing_object(exc):
        logger.info("object not found: %s", exc)
        return _envelope("File not found.", "not_found", 404)

    @app.errorhandler(InvalidId)
    def _handle_invalid_id(exc):
        logger.info("invalid object id: %s", exc)
        return _envelope("Invalid file ID.", "bad_request", 400)

    @app.errorhandler(PyMongoError)
    def _handle_mongo_error(exc):
        # Deliberately not an empty result: a database outage must not render
        # as "you have no files".
        logger.exception("MongoDB error")
        return _envelope(
            "Could not reach the database. Please try again.",
            "storage_unavailable",
            503,
        )

    @app.errorhandler(ClientError)
    @app.errorhandler(BotoCoreError)
    def _handle_s3_error(exc):
        logger.exception("S3 error")
        return _envelope(
            "Could not reach file storage. Please try again.",
            "storage_unavailable",
            503,
        )

    @app.errorhandler(HTTPException)
    def _handle_http_exception(exc):
        # Werkzeug's own aborts (404 on an unknown route, 405, 413 over
        # MAX_CONTENT_LENGTH) already carry safe descriptions.
        return _envelope(exc.description, exc.name.lower().replace(" ", "_"), exc.code)

    @app.errorhandler(Exception)
    def _handle_unexpected(exc):
        logger.exception("unhandled exception")
        return _envelope("An unexpected error occurred.", "internal_error", 500)
