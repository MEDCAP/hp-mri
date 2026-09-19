'''
Reconstruct MRS data

EPSI
- upload a folder to s3 bucket
- converter tyger to aggregate data
- tyger buffer write from s3 bucket
- reconstruct and return data to tyger buffer read
- buffer cp to s3 bucket

The reconstruction engine itself lives in app/recon/utils/mrd2recon.py and is
complete as a library/CLI. What is missing here is the decision about how to run
it: mrd2recon does minutes-long fits, and gunicorn runs with --timeout 60, so
wiring it straight into this handler would time out. It needs a job queue.
'''
from app.errors import ApiError

from app.recon import recon_bp


@recon_bp.route("/recon", methods=["POST"])
def reconstruct_epsi():
    '''
    Reconstruct EPSI data.

    Not implemented. Registered so the route exists and reports its status
    honestly instead of 404ing as if the feature were unknown.
    '''
    raise ApiError(
        "Reconstruction is not implemented yet.",
        code="not_implemented",
        status=501,
    )
