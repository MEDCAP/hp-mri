"""
Running a stage, and chaining stages, through the tyger CLI.

Intermediates move between stages through temp files rather than memory: a
converted EPSI scan is large, and the recon stage already buffers the whole
acquisition set itself.

Tyger's stderr carries cluster names, buffer ids and paths, which is exactly
what app/errors.py exists to keep away from a caller. A failure is therefore
logged in full server-side and raised as a StageFailed naming only the stage.
"""
import contextlib
import logging
import subprocess
import tempfile

from app.errors import ApiError
from app.tyger.stages import get_stage, render_codespec

logger = logging.getLogger(__name__)

_TYGER = "tyger"


class StageFailed(ApiError):
    """A pipeline stage did not complete."""

    status = 502
    code = "stage_failed"


def run_stage(stage_id, params, stdin_fp, stdout_fp):
    """Run one stage, reading from stdin_fp and writing to stdout_fp."""
    stage = get_stage(stage_id)
    codespec = render_codespec(stage_id, params)

    with tempfile.NamedTemporaryFile("w", suffix=".yml") as spec_file:
        spec_file.write(codespec)
        spec_file.flush()

        try:
            result = subprocess.run(
                [_TYGER, "run", "exec", "-f", spec_file.name],
                stdin=stdin_fp,
                stdout=stdout_fp,
                stderr=subprocess.PIPE,
                check=False,
                timeout=stage.timeout_seconds,
            )
        except FileNotFoundError as exc:
            logger.error("the tyger CLI is not on PATH: %s", exc)
            raise StageFailed(
                "The processing service is unavailable."
            ) from exc
        except subprocess.TimeoutExpired as exc:
            logger.error("stage %s timed out after %ss", stage_id, stage.timeout_seconds)
            raise StageFailed(f"The {stage_id} stage timed out.") from exc

    if result.returncode != 0:
        logger.error(
            "stage %s exited %s; tyger stderr follows:\n%s",
            stage_id,
            result.returncode,
            result.stderr.decode("utf-8", "replace"),
        )
        raise StageFailed(f"The {stage_id} stage failed.")


def run_chain(stage_specs, source_fp, stage_context=None):
    """
    Run stages in order, stage N's output becoming stage N+1's input.

    Takes a readable file object and returns the final temp file, positioned at
    0 and owned by the caller to close. Nothing here is ever a bytes object:
    boto3's download_fileobj and upload_fileobj sit either side of this, so a
    scan streams S3 -> temp -> chain -> temp -> S3 without materialising.

    `stage_specs` is a list of {"id", "params"}. `stage_context` is an optional
    stage_id -> context manager, which is how a job records each stage's
    transitions without the runner knowing anything about jobs.
    """
    if not stage_specs:
        raise StageFailed("The pipeline has no stages.")

    enter = stage_context or (lambda _stage_id: contextlib.nullcontext())

    current, owned = source_fp, False
    try:
        for spec in stage_specs:
            current.seek(0)
            output = tempfile.TemporaryFile()
            try:
                with enter(spec["id"]):
                    run_stage(spec["id"], spec.get("params"), current, output)
            except Exception:
                output.close()
                raise
            if owned:
                # closed as the chain advances, so a long chain never has more
                # than two intermediates on disk at once
                current.close()
            current, owned = output, True
        current.seek(0)
        return current
    except Exception:
        if owned:
            current.close()
        raise
