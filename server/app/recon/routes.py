'''
Reconstruct MRS data.

A reconstruction is a chain of container stages run through tyger: typically
`shift` to take the echo drift out of a converted scan, then `recon` to fit the
peaks. Each stage reads the previous one's output, so the file streams
S3 -> temp -> chain -> temp -> S3 and is never held in memory as a whole.

The chain runs for minutes and gunicorn kills a request at 60 seconds, so the
route starts a job and answers with its id. The output is stored as an ordinary
mrdfile document, which is what makes it appear in the file list and the viewer
like any other file; `parentFileId` and `reconStages` on that document are what
trace it back to the scan it came from.

The engine in app/recon/utils/ is not imported here and is not what runs. The
reconstruction lives in the ghcr.io/medcap/mrs-recon image.
'''
import os
import tempfile

from bson import ObjectId
from flask import current_app, jsonify, request

from app.auth import require_auth
from app.errors import BadRequest, NotFound
from app.jobs.service import start_job
from app.tyger.runner import run_chain

from app.recon import recon_bp

from data import get_mrdfile_by_id, insert_mrdfile_header, read_mrdfile_header


def _output_filename(source_filename):
    """What the reconstruction of a file is called."""
    stem = os.path.splitext(source_filename or "reconstruction")[0]
    return f"{stem}-recon.mrd2"


@recon_bp.route("/recon", methods=["POST"])
@require_auth
def reconstruct_epsi():
    '''
    Run a reconstruction chain over a stored file.

    Body: {fileId, stages: [{id, params}]}. Returns {jobId}; poll /api/jobs/<id>
    for progress and for the output_file_id the run produced.
    '''
    body = request.get_json(silent=True) or {}

    file_id = body.get("fileId")
    if not file_id:
        raise BadRequest("fileId is required")

    source = get_mrdfile_by_id(file_id)
    if not source:
        raise NotFound("File not found")

    stages = body.get("stages")
    bucket = current_app.config['S3_BUCKET']
    source_key = f"mrd_files/{file_id}"

    owner_name = body.get("ownerName") or source.get("ownerName")
    filename = _output_filename(source.get("original_filename"))

    output_id = ObjectId()
    output_key = f"mrd_files/{str(output_id)}"

    def work(handle):
        with tempfile.TemporaryFile() as raw:
            handle.s3.download_fileobj(bucket, source_key, raw)
            raw.seek(0)
            with run_chain(stages, raw, stage_context=handle.stage) as result:
                size = result.seek(0, os.SEEK_END)
                result.seek(0)
                metadata = read_mrdfile_header(
                    result,
                    owner_name=owner_name,
                    original_filename=filename,
                    file_size=size,
                )

                # Uploaded before the document is written, so a listed file
                # always has an object behind it.
                result.seek(0)
                handle.s3.upload_fileobj(result, bucket, output_key)

        insert_mrdfile_header(
            {**metadata, "s3_key": output_key, "parentFileId": str(file_id),
             "reconStages": stages},
            doc_id=output_id,
        )
        return str(output_id)

    job_id = start_job(
        "recon",
        {"stages": stages, "inputFileId": str(file_id), "ownerName": owner_name},
        work,
    )
    return jsonify({"jobId": job_id}), 202
