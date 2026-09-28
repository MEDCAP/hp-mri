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

It is not the API's access control; the Cognito token check behind it is (every
route that returns a full document or changes data requires a token; see the API
table in CLAUDE.md). The function adds nothing to that. Delete it and drop api_function_arn from
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
terraform/modules/data emits a least-privilege policy: read/write/delete on
mrd_files/ and uploads/staging/, read on the MRS/ demo datasets.

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

issue "Restrict who can delete a file" \
  "security,backend" "Security" \
"DELETE /api/mrd-file authorises with get_mrdfile_by_id_with_auth -- the READ
check. It admits the owner, any member of the file's group, and, for legacy
files with neither ownerId nor groupName, any signed-in user. So group members
can delete each other's files, and anyone can delete every pre-groups file.

Confirmed against a real MongoDB: server/tests/test_access_integration.py
carries two strict xfails
(test_a_group_member_cannot_delete_another_members_file,
test_any_user_cannot_delete_a_legacy_file) that assert the intended behaviour
and fail today.

Contrast change_file_visibility, which requires ownership -- a group member
cannot make a file private, but can delete it. Decide the policy (owner only?
owner or group admin? who owns legacy files?), fix the route, and remove the
xfail markers. medcap-data has no versioning (finding F3), so today these
deletes are unrecoverable."

# --- deploy blockers --------------------------------------------------------

issue "Add CORS to medcap-data before the presigned upload flow ships" \
  "infra,blocked" "Infra: Terraform + CI/CD" \
"The bucket has no CORS configuration. The presigned upload on dev has the
browser PUT directly to uploads/staging/<sub>/<uploadId>, which CORS blocks, so
uploads fail as soon as dev deploys against this bucket.

Needs PUT allowed from https://medcap.ai (and http://localhost:5173) with ETag
exposed. Already written in
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
every request that touches the database.

The dev bucket also starts without the MRS/ demo datasets, so the HUPC and
MR Solutions viewer routes have nothing to read there until they are copied."

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
tree, so every call raises NameError and answers 500.

Decide where DICOM uploads should actually go — most likely S3, like everything
else, rather than a local directory that does not survive a task restart."

issue "Fix GET /api/get_imaging_metadata (hardcoded laptop path)" \
  "bug,backend" "Backend correctness" \
"Reads /Users/benjaminyoon/Desktop/PIGI folder/... so it only ever worked on one
machine. It is described as mock data; either move the fixture into the repo or
delete the endpoint."

issue "Split groups out of data.py" \
  "tech-debt,backend" "Backend correctness" \
"data.py is ~1100 lines mixing file CRUD, S3 access, MRD header and array
reading, and the whole groups domain (membership, admins, invite codes, join
requests, settings). The groups functions are over half the file and touch no
S3 or MRD code; they are the natural seam."

issue "Finish externalising configuration" \
  "tech-debt,backend" "Backend correctness" \
"Still hardcoded: the demo dataset prefixes (MRS/s_2023041103/ in
hupc_processing.py, MRS/proton/ and MRS/epsi/ in mr_solutions_processing.py),
and the local /Users/benjaminyoon/... paths both modules switch to when
running locally.

Once production runs with MONGO_DB_NAME set and the database is renamed to
hpmri_prod (terraform/README.md), flip the MONGO_DB_NAME default in config.py
from medcap_dev to hpmri_dev."

issue "Add an /api/v1 prefix" \
  "backend,tech-debt" "Backend correctness" \
"The SPA and API deploy independently, and CloudFront invalidates the SPA after
the ECS service stabilises, so there is always a window where an old SPA talks
to a new API. Version the API before that matters.

Keep /api/* as an alias for one release. Do this after the CI/CD pipeline
exists, so the overlap is actually deployable."

issue "Drop the mrd-python pin if nothing needs it" \
  "tech-debt,backend" "Backend correctness" \
"server/requirements.txt pins mrd-python==2.0.1, but the server's own code
imports only the vendored submodule (app.external.python.mrd). Check whether
the submodule depends on the PyPI package; if not, remove the pin so only one
MRD library is installed."

# --- frontend ---------------------------------------------------------------

issue "Implement GIF export or remove the UI" \
  "frontend" "Feature completion" \
"pages/viewerpages/ViewerPage.tsx:78 is literally 'const onExportGif = () => {};'
while ViewerSidePanel renders a full set of controls — start frame, end frame,
fps, filename — that do nothing. gif.js.optimized is a dependency whose only
import is commented out in ViewerPage_v1.tsx.

Either implement it or remove the controls; silently doing nothing is the worst
of the three."

issue "Remove the hardcoded Cognito fallbacks" \
  "frontend,tech-debt" "Feature completion" \
"config/env.ts:9-10 falls back to literal pool and client IDs. Once every build
supplies VITE_COGNITO_*, drop the fallbacks so a misconfigured build fails
loudly instead of silently pointing at production."

issue "Add a frontend test runner" \
  "frontend,tech-debt" "Feature completion" \
"No tests and no runner configured. The SPA has none."

issue "Finish the auth stub pages and the Members bios" \
  "frontend" "Feature completion" \
"features/auth/SignUpPage.tsx:43 and AccountPage.tsx:13 carry TODOs for loading
state and Cognito logic, and features/home/MembersPage.tsx ships 'TODO - N/A'
placeholder bios in what is a public-facing page."

echo
if $DRY_RUN; then
  echo "Dry run. Re-run without --dry-run to create these."
else
  echo "Done. Review at: https://github.com/$REPO/issues"
fi
