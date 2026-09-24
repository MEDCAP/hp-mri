#!/usr/bin/env bash
#
# File the verified backlog as GitHub issues on MEDCAP/hp-mri.
#
# NOT RUN AUTOMATICALLY. Creating ~25 issues in a shared org repository is
# visible to the whole group and tedious to undo, so it waits for a human.
#
#   ./scripts/create-issues.sh --dry-run   # print what would be created
#   ./scripts/create-issues.sh             # actually create them
#
# Safe to re-run: an issue whose exact title already exists (open or closed) is
# skipped rather than duplicated.
#
# Source of truth: docs/KNOWN-ISSUES.md and terraform/docs/INVENTORY.md. Items
# already fixed on this branch are deliberately absent.

set -euo pipefail

REPO="MEDCAP/hp-mri"
DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

command -v gh >/dev/null || { echo "gh is required" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "run: gh auth login" >&2; exit 1; }

label() {
  local name=$1 colour=$2 description=$3
  if $DRY_RUN; then
    echo "label: $name"
    return
  fi
  gh label create "$name" --repo "$REPO" --color "$colour" --description "$description" \
    2>/dev/null || true
}

milestone() {
  local title=$1
  if $DRY_RUN; then
    echo "milestone: $title"
    return
  fi
  gh api "repos/$REPO/milestones" -f title="$title" >/dev/null 2>&1 || true
}

# Cached once; listing per issue would be ~25 API round trips.
EXISTING=""
load_existing() {
  EXISTING=$(gh issue list --repo "$REPO" --state all --limit 500 --json title \
    --jq '.[].title' 2>/dev/null || true)
}

issue() {
  local title=$1 labels=$2 ms=$3 body=$4

  if grep -Fxq "$title" <<<"$EXISTING"; then
    echo "skip (exists): $title"
    return
  fi

  if $DRY_RUN; then
    echo "create [$labels] ($ms): $title"
    return
  fi

  gh issue create --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --milestone "$ms" \
    --body "$body"
}

load_existing

# --- labels and milestones --------------------------------------------------

label infra      "0e8a16" "Terraform, AWS, deployment"
label ci-cd      "1d76db" "Pipelines and automation"
label security   "b60205" "Security issue"
label tech-debt  "fbca04" "Maintainability"
label backend    "5319e7" "Flask API"
label frontend   "006b75" "React SPA"
label blocked    "d93f0b" "Waiting on another issue or a decision"

milestone "Security"
milestone "Infra: Terraform + CI/CD"
milestone "Backend correctness"
milestone "Feature completion"

# --- security ---------------------------------------------------------------

issue "Remove the decorative Referer check at the edge" \
  "security,infra" "Security" \
"CloudFront Function \`secureApiForwarding\` rejects /api/* requests whose
\`Referer\` does not contain \`medcap.ai\`, then injects \`x-origin-verify\`. The
client sets Referer, the substring test passes for medcap.ai.example.com, and
nothing in the backend reads the injected header -- whose value sits in plaintext
for anyone with cloudfront:GetFunction.

It is not the API's access control; the Cognito token check on the data routes
is (verified: GET /api/mrd-files without a token returns 401 in production). The
function adds nothing to that. Delete it and drop api_function_arn from
terraform/envs/prod.

Finding F1."

issue "Split ecsTaskExecutionRole and drop AmazonS3FullAccess" \
  "security,infra" "Security" \
"The ECS task role and execution role are the same role, and it carries
AmazonS3FullAccess. The application therefore has read, write and delete on
every bucket in the account — including upenn-security.aws-medcap-psom,
epsi-kidney-data and upenn-research.medcap-01 — not just medcap-data.

With a data bucket that has no versioning, this is the most serious exposure in
the system: any code path holding the role can destroy data in buckets that have
nothing to do with this application.

terraform/modules/backend-ecs already models a proper pair, and
terraform/modules/data emits a least-privilege policy scoped to the mrd_files/
and uploads/staging/ prefixes.

BLOCKER: ecsTaskExecutionRole is also the principal MongoDB Atlas trusts for
MONGODB-AWS auth. Add the new task role ARN as an Atlas database user BEFORE
switching, or production loses database access.

Finding F2."

issue "Enable versioning on the medcap-data bucket" \
  "security,infra" "Security" \
"The primary research data bucket has no versioning, so any delete — accidental,
by a signed-in user, a buggy deploy, or the task role — is unrecoverable.

One flag in terraform/envs/prod/main.tf (versioning_enabled), left false so the
adoption plan is clean. Flip it in a PR whose whole diff is that line.

Finding F3."

issue "Confirm the viewer is meant to be open to guests" \
  "security,frontend" "Security" \
"/viewer is not wrapped in ProtectedRoute, and the viewer API uses @optional_auth.
Given the guest access / public datasets feature, that is probably intended --
guests view public data. Confirm it, and confirm that @optional_auth routes check
per-file visibility server-side, so a guest cannot view a private file by id."

# --- deploy blockers --------------------------------------------------------

issue "Add CORS to medcap-data before the presigned upload flow ships" \
  "infra,blocked" "Infra: Terraform + CI/CD" \
"The bucket has no CORS configuration. The presigned upload has the browser PUT
directly to S3, which CORS will block, so uploads will fail the moment the
current branch deploys.

Needs PUT allowed from https://medcap.ai with ETag exposed. Already written in
terraform/modules/data; it has not been applied.

Finding F4. Blocks any deploy of the presigned upload flow."

issue "Create the uploads/staging/ lifecycle rule config.py already assumes" \
  "infra" "Infra: Terraform + CI/CD" \
"server/config.py documents that a lifecycle rule expires the staging prefix
after a day. No such rule exists, so abandoned uploads accumulate and are billed
indefinitely.

Finding F5."

issue "Decide how to adopt the ECS cluster and service without a replace" \
  "infra,blocked" "Infra: Terraform + CI/CD" \
"The live cluster and service are named mrissim-test1 and medcap-app-service-v3;
the Terraform module would name them hpmri-prod. Importing under a different
name forces a replace, which for a cluster and service means downtime.

Either set name_prefix to match the existing names, or accept a one-time
migration in a maintenance window. This is the one place adoption cannot be
silent, and it blocks import group 3.

See terraform/envs/prod/imports.tf."

# --- infrastructure ---------------------------------------------------------

issue "Right-size the ECS task and move off FARGATE_SPOT" \
  "infra" "Infra: Terraform + CI/CD" \
"Production runs 4096 CPU / 8192 MiB on a single FARGATE_SPOT task. Measured
over 14 days: 0.1% average CPU (15% peak), 233 MiB resident, ~57 API requests
per day with 6 of 14 days at zero.

Right-sizing to 1024/2048 on-demand costs LESS than the current oversized spot
task and removes the single point of failure — one spot reclamation currently
takes the whole API down.

Finding F6. Module defaults already reflect the recommendation."

issue "Resolve the second CloudFront distribution pointing at a deleted ALB" \
  "infra" "Infra: Terraform + CI/CD" \
"Distribution E1LTBXHERJ8IYX is enabled and deployed, with a VPC origin pointing
at internal-medcap-app-private-alb-779687738 — a load balancer that no longer
exists. Its comment suggests an abandoned public-to-private migration.

No alias routes to it, but it is live and billable. Decide whether it represents
intended architecture, then finish or delete it. Deliberately not imported.

Finding F7."

issue "Set log retention on /ecs/medcap-app" \
  "infra" "Infra: Terraform + CI/CD" \
"The log group has no retention policy, so logs are kept and billed forever.
/ecs/medcap-app-task-def-publicALB-8000 also looks orphaned."

issue "Run the Terraform adoption sequence" \
  "infra" "Infra: Terraform + CI/CD" \
"terraform/ is written and validates but has never been applied. Order:
bootstrap -> global -> prod data -> auth -> network + backend-ecs ->
frontend-cdn -> envs/dev.

Every import PR must plan 0 to add, 0 to change, 0 to destroy before merging.
Any destroy or replace in an import plan is a blocker.

Runbook: terraform/README.md."

issue "Stand up the dev environment" \
  "infra" "Infra: Terraform + CI/CD" \
"Dev and prod still share one Atlas cluster and one S3 bucket. terraform/envs/dev
exists and validates but has never been applied.

Two manual steps Terraform cannot do: add the dev task role ARN as an Atlas
database user, and create the hpmri_dev database. Until then dev returns 503 on
every request that touches the database."

issue "Create the MRD_FORK_DEPLOY_KEY secret" \
  "ci-cd,blocked" "Infra: Terraform + CI/CD" \
".gitmodules uses an SSH URL for MEDCAP/mrd-fork, which actions/checkout cannot
authenticate with its token input. The Dockerfile COPYs app/ including
app/external, so the image build job fails without a read-only deploy key stored
as MRD_FORK_DEPLOY_KEY.

Blocks the image and deploy jobs."

issue "Configure the dev and prod GitHub Environments" \
  "ci-cd" "Infra: Terraform + CI/CD" \
"The deploy workflows read SITE_BUCKET, CF_DISTRIBUTION_ID, PUBLIC_BASE_URL and
VITE_COGNITO_* from GitHub Environment variables, populated from the Terraform
outputs. Put required reviewers on prod — the release policy is that a v* tag
plus a human approval ships production."

# --- backend ----------------------------------------------------------------

issue "Fix POST /api/viewer-upload (UPLOAD_FOLDER is undefined)" \
  "bug,backend" "Backend correctness" \
"UPLOAD_FOLDER is referenced in app/viewer/routes.py and defined nowhere in the
tree, so the endpoint raises NameError on every call. It now fails loudly with a
logged traceback rather than a masked 500, but it is still broken.

Decide where DICOM uploads should actually go — most likely S3, like everything
else, rather than a local directory that does not survive a task restart."

issue "Fix GET /api/get_imaging_metadata (hardcoded laptop path)" \
  "bug,backend" "Backend correctness" \
"Reads /Users/benjaminyoon/Desktop/PIGI folder/... so it only ever worked on one
machine. It is described as mock data; either move the fixture into the repo or
delete the endpoint."

issue "Decide the fate of app/simulator/" \
  "backend,tech-debt" "Backend correctness" \
"simulator/routes.py decorates with @mrds_bp without importing it and reads an
undefined db_simulator, so the module would raise on import. The blueprint is
not registered, and the SPA's GET /api/simulator therefore 404s.

Either delete it as dead code and remove the frontend caller, or implement it.
Blocks the SimulatorPage issue either way."

issue "Stop doing S3 I/O at module import time" \
  "bug,backend" "Backend correctness" \
"app/viewer/magnets/mr_solutions_processing.py calls list_objects_v2 while the
module is being imported, so create_app() fails outright without live AWS
credentials. Consequences: ECS task startup depends on S3 being reachable, cold
start pays a network round trip, local development needs credentials even for
frontend work, and the test suite has to stub these modules to run at all.

Both magnet modules also construct boto3 clients at import and hardcode
BUCKET_NAME = medcap-data a second and third time.

Move the discovery behind a lazily-evaluated function."

issue "Give reconstruction an execution model" \
  "backend" "Feature completion" \
"mrd2recon runs minutes-long fits; gunicorn runs --timeout 60 and the ALB idle
timeout matches. POST /api/recon is registered and returns 501 because running
it synchronously cannot work at any container size.

Needs a job queue: AWS Batch or a Step Functions-invoked Fargate task, with the
API returning a job id and the SPA polling. Not Lambda — 15-minute ceiling, and
these are CPU-bound numeric fits.

Blocks the ReconstructModal issue."

issue "Remove module-level mutable state from the scientific modules" \
  "tech-debt,backend" "Backend correctness" \
"lorn.py, mrd2recon.py and hupc_processing.py keep module-level mutable arrays
(centers, widths, phases, spect, experiment globals). Non-reentrant and unsafe
across gunicorn workers, which currently run two.

This is most of the remaining pylint gap and is deliberately not disabled away."

issue "Split the MRD stream walking out of data.py" \
  "tech-debt,backend" "Backend correctness" \
"data.py is ~490 lines mixing Mongo CRUD, S3 I/O, MRD stream walking and numpy
reshaping. The ~300 lines of walking (_walk_mrd_arrays, _describe_item,
_to_image_6d, _to_trace_3d) touch no database and are the natural seam."

issue "Bound _MRD_BYTES_CACHE by size and make it safe to share" \
  "tech-debt,backend" "Backend correctness" \
"The cache caps at 3 entries rather than bytes, so three large MRD files can pin
an unbounded amount of memory. It is also per-worker and not thread-safe."

issue "Finish externalising configuration" \
  "tech-debt,backend" "Backend correctness" \
"Still hardcoded: ProductionConfig.MONGO_URI, the S3 prefix MRS/s_2023041103/ in
hupc_processing.py, and Windows output paths in mrd2recon.py.

The Dockerfile also sets ENV FLASK_ENV=production at build time, so one image
cannot serve two environments and docker run --env-file .env.development
silently loads ProductionConfig. Add a HEALTHCHECK while in there."

issue "Add an /api/v1 prefix" \
  "backend,tech-debt" "Backend correctness" \
"The SPA and API deploy independently, and CloudFront invalidates the SPA after
the ECS service stabilises, so there is always a window where an old SPA talks
to a new API. Version the API before that matters.

Keep /api/* as an alias for one release. Do this after the CI/CD pipeline
exists, so the overlap is actually deployable."

issue "Unify on one MRD library" \
  "tech-debt,backend" "Backend correctness" \
"Two MRD libraries are live in the same process. data.py imports the vendored
submodule (app.external.python.mrd), while recon/utils/mrd2recon.py and
mrdplot.py do a bare 'import mrd', which resolves to the PyPI mrd-python pin.
Removing the pin breaks reconstruction; unify on the submodule first, then drop
it."

# --- frontend ---------------------------------------------------------------

issue "Implement GIF export or remove the UI" \
  "frontend" "Feature completion" \
"features/viewer/ViewerPage.tsx:99 is literally 'const onExportGif = () => {};'
while ExportSection renders a full set of controls — start frame, end frame,
fps, filename — that do nothing. gif.js.optimized is a dependency that is never
imported.

Either implement it or remove the controls; silently doing nothing is the worst
of the three."

issue "Wire ReconstructModal to the backend" \
  "frontend,blocked" "Feature completion" \
"features/recon/ReconstructModal.tsx:159 is a TODO. Blocked on the reconstruction
execution model."

issue "Fix or remove the SimulatorPage backend call" \
  "frontend,blocked" "Feature completion" \
"api/simulator.ts calls GET /api/simulator, which no live route serves. Blocked
on the app/simulator/ decision."

issue "Remove the hardcoded Cognito fallbacks" \
  "frontend,tech-debt" "Feature completion" \
"config/env.ts:9-10 falls back to literal pool and client IDs. Once every build
supplies VITE_COGNITO_*, drop the fallbacks so a misconfigured build fails
loudly instead of silently pointing at production."

issue "Add a frontend test runner" \
  "frontend,tech-debt" "Feature completion" \
"No tests and no runner configured. The SPA has none."

issue "Finish the auth and simulator stub pages" \
  "frontend" "Feature completion" \
"SignUpPage.tsx:43 and AccountPage.tsx:13 are TODO stubs, NewSimulatorPage is
mostly TODO, and MembersPage ships 'TODO - N/A' placeholder bios in what is a
public-facing page."

echo
if $DRY_RUN; then
  echo "Dry run. Re-run without --dry-run to create these."
else
  echo "Done. Review at: https://github.com/$REPO/issues"
fi
