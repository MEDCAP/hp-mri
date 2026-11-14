"""
Chaining pipeline stages through tyger buffers and runs.

The source is written to a tyger buffer, each stage is started with
`tyger run create` reading one buffer and writing a fresh one, and only the
last stage's buffer is read back. Intermediates stay inside tyger, and no CLI
process is held open on this server while a stage runs. Every buffer a chain
creates is deleted when it ends, and buffers and runs carry `app=hpmri` plus
the caller's tags (the job id) so leftovers can be traced.

A run that fails still leaves partial data in its output buffer, so a stage's
status is checked before anything downstream reads it.

Tyger's stderr and run logs carry cluster names, buffer ids and paths, which is
exactly what app/errors.py exists to keep away from a caller. A failure is
therefore logged in full server-side and raised as a StageFailed naming only
the stage.
"""
import contextlib
import json
import logging
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone

from app.errors import ApiError
from app.tyger.stages import get_stage, render_codespec
from config import Config

logger = logging.getLogger(__name__)

_TYGER = "tyger"
_APP_TAGS = {"app": "hpmri"}
_SWEEP_AGE = timedelta(days=3)
_LOG_TAIL_CHARS = 4000
_HOUSEKEEPING_TIMEOUT = 120
_UNAVAILABLE = "The processing service is unavailable."


class StageFailed(ApiError):
    """A pipeline stage did not complete."""

    status = 502
    code = "stage_failed"


def _tyger(*args, failure=_UNAVAILABLE, stdin=None, stdout=subprocess.PIPE, timeout=None):
    """Run one tyger command; return its stdout as text when captured."""
    try:
        result = subprocess.run(
            [_TYGER, *args],
            stdin=stdin,
            stdout=stdout,
            stderr=subprocess.PIPE,
            check=False,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        logger.error("the tyger CLI is not on PATH: %s", exc)
        raise StageFailed(_UNAVAILABLE) from exc

    if result.returncode != 0:
        logger.error(
            "tyger %s exited %s; stderr follows:\n%s",
            " ".join(args[:2]),
            result.returncode,
            (result.stderr or b"").decode("utf-8", "replace"),
        )
        raise StageFailed(failure)

    if stdout is subprocess.PIPE:
        return (result.stdout or b"").decode("utf-8", "replace").strip()
    return None


def _tag_args(tags):
    return [arg for key, value in tags.items() for arg in ("--tag", f"{key}={value}")]


def _create_buffer(tags, failure):
    args = ["buffer", "create", *_tag_args(tags)]
    # Meant to be 3.00:00:00, but the server currently answers a --ttl with
    # HTTP 500, so it is off unless configured; _sweep covers the gap.
    if Config.TYGER_BUFFER_TTL:
        args += ["--ttl", Config.TYGER_BUFFER_TTL]
    return _tyger(*args, failure=failure)


def _delete_buffers(buffer_ids):
    if not buffer_ids:
        return
    try:
        _tyger("buffer", "delete", *buffer_ids, timeout=_HOUSEKEEPING_TIMEOUT)
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("could not delete tyger buffers %s", buffer_ids)


def _created_at(buffer):
    # Seconds precision is enough here, and avoids depending on how many
    # fractional digits the server sends.
    return datetime.strptime(buffer["createdAt"][:19], "%Y-%m-%dT%H:%M:%S").replace(
        tzinfo=timezone.utc
    )


def _sweep():
    """Delete this app's buffers older than _SWEEP_AGE, which a crashed chain leaves behind."""
    try:
        listed = json.loads(_tyger("buffer", "list", *_tag_args(_APP_TAGS),
                                   timeout=_HOUSEKEEPING_TIMEOUT))
        cutoff = datetime.now(timezone.utc) - _SWEEP_AGE
        stale = [buffer["id"] for buffer in listed if _created_at(buffer) < cutoff]
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("could not list tyger buffers for the sweep")
        return
    _delete_buffers(stale)


def _run_stage(spec, input_id, output_id, tags):
    """Run one stage from input_id into output_id and require it to succeed."""
    stage_id = spec["id"]
    stage = get_stage(stage_id)
    failed = f"The {stage_id} stage failed."

    with tempfile.NamedTemporaryFile("w", suffix=".yml") as spec_file:
        spec_file.write(render_codespec(stage_id, spec.get("params")))
        spec_file.flush()
        run_id = _tyger(
            "run", "create", "-f", spec_file.name,
            "-b", f"input={input_id}", "-b", f"output={output_id}",
            *_tag_args({**tags, "stage": stage_id}),
            failure=failed,
        )

    try:
        _tyger("run", "watch", run_id, failure=failed,
               stdout=subprocess.DEVNULL, timeout=stage.timeout_seconds)
    except subprocess.TimeoutExpired as exc:
        logger.error("stage %s (run %s) timed out after %ss",
                     stage_id, run_id, stage.timeout_seconds)
        try:
            _tyger("run", "cancel", run_id)
        except Exception:  # pylint: disable=broad-exception-caught
            logger.exception("could not cancel run %s", run_id)
        raise StageFailed(f"The {stage_id} stage timed out.") from exc

    status = json.loads(_tyger("run", "show", run_id, failure=failed)).get("status")
    if status != "Succeeded":
        try:
            logs = _tyger("run", "logs", run_id)[-_LOG_TAIL_CHARS:]
        except Exception:  # pylint: disable=broad-exception-caught
            logs = "(the run's logs could not be fetched)"
        logger.error("stage %s (run %s) ended %s; log tail follows:\n%s",
                     stage_id, run_id, status, logs)
        raise StageFailed(failed)


def run_chain(stage_specs, source_fp, stage_context=None, tags=None):
    """
    Run stages in order, stage N's output buffer becoming stage N+1's input.

    Takes a readable file object and returns a temp file holding the final
    output, positioned at 0 and owned by the caller to close.

    `stage_specs` is a list of {"id", "params"}. `stage_context` is an optional
    stage_id -> context manager, which is how a job records each stage's
    transitions without the runner knowing anything about jobs. `tags` are
    added to every buffer and run the chain creates.
    """
    if not stage_specs:
        raise StageFailed("The pipeline has no stages.")

    enter = stage_context or (lambda _stage_id: contextlib.nullcontext())
    tags = {**_APP_TAGS, **(tags or {})}
    first_failed = f"The {stage_specs[0]['id']} stage failed."
    last_failed = f"The {stage_specs[-1]['id']} stage failed."

    _sweep()

    buffers = []
    try:
        buffers.append(_create_buffer(tags, first_failed))
        source_fp.seek(0)
        _tyger("buffer", "write", buffers[-1], failure=first_failed, stdin=source_fp)

        for spec in stage_specs:
            with enter(spec["id"]):
                input_id = buffers[-1]
                buffers.append(_create_buffer(tags, f"The {spec['id']} stage failed."))
                _run_stage(spec, input_id, buffers[-1], tags)

        result = tempfile.TemporaryFile()
        try:
            _tyger("buffer", "read", buffers[-1], failure=last_failed, stdout=result)
        except Exception:
            result.close()
            raise
        result.seek(0)
        return result
    finally:
        _delete_buffers(buffers)
