# HP-MRI Web App

Full-stack app for the MEDCAP group (UPenn) to upload, share, visualize and reconstruct
Hyperpolarized MRI (HP-MRI) data in the MRD format. A React SPA talks to a Flask REST API
backed by MongoDB Atlas (metadata) and S3 (binary MRD files). Cognito handles sign-in;
guests can browse files in the public group.

## Repo layout

- `hp-mri-frontend/` — React 18 + Vite + TypeScript SPA (MUI, Plotly, axios, Cognito)
- `server/` — Flask app factory with blueprints under `/api`
- `server/app/external/` — **git submodule** (`MEDCAP/mrd-fork`, branch `dev`): the
  YARDL-generated MRD library. Never edit it here; change the fork instead.
- `aws-deploy-cdk/` — empty CDK skeleton, to be replaced by Terraform
  (`infra/terraform`, not yet merged)

## Dev commands

```bash
git submodule update --init                 # once; the backend imports the MRD library

# backend (port 5000). Reaching real data needs federated AWS creds in
# server/.env.development; starting the app and running tests does not.
cd server && ./setup_aws.sh && python run.py
cd server && pytest                         # unit tests, no AWS or MongoDB needed

# write-path and access-control tests against a real MongoDB
docker compose -f docker-compose.test.yml up -d
cd server && MONGO_TEST_URI=mongodb://localhost:27017 pytest

# frontend (port 5173; /api proxied to 127.0.0.1:5000 by vite.config.ts)
cd hp-mri-frontend && npm install && npm run dev
npm run build        # tsc -b && vite build; this is the type check
npm run lint
```

Never point `MONGO_TEST_URI` at Atlas: each test creates a uniquely named database
and drops it afterwards.

## Backend conventions

- Blueprints `mrds`, `viewer` and `groups` are registered in `server/app/__init__.py`
  with `url_prefix="/api"`. `GET /api/health` is inline there, for the ALB.
- **Errors: raise, don't format.** Raise `ApiError`/`BadRequest`/`NotFound`/
  `StorageUnavailable` from `app/errors.py`. The shared handlers answer
  `{"error": <string>, "code": <tag>}`, log unexpected exceptions with a traceback,
  and never return `str(e)` to the caller. `PyMongoError` → 503, `FileNotFoundError` → 404,
  `InvalidId` → 400. Only catch broadly where per-item isolation is the point (batch
  upload/delete results).
- **Auth:** `@requires_auth` or `@optional_auth` from `app/auth.py`. Both set
  `g.user_sub`, `g.user_email`, `g.user_name` and `g.user_groups` (`None`/empty for
  guests). Take ownership from `g`, never from the request body.
- **Access rules:** users see their own files, their groups' files, the `public`
  group, and legacy files (no `ownerId` and no `groupName`); guests see `public`
  only. Use `list_mrdfiles_for_user` and `get_mrdfile_by_id_with_auth` in `data.py`.
  Only an owner may change visibility.
- **Data layer:** `server/data.py` holds Mongo CRUD, S3 I/O and MRD parsing. Use
  `get_db()` (reads `MONGO_DB_NAME`) and the process-wide `get_s3_client()`; the
  bucket comes from `current_app.config['S3_BUCKET']`. Listings propagate database
  failures instead of returning `[]`. Nothing touches S3 at import time, so keep it that way.
- **Config:** `server/config.py` reads `S3_BUCKET`, `MONGO_DB_NAME`, `MONGO_URI`,
  `CORS_ORIGINS`, `MAX_UPLOAD_BYTES` and `PRESIGN_EXPIRY_SECONDS` once, at import.
  `MONGO_DB_NAME` deliberately defaults to `medcap_dev`, which is **production's**
  database: the live task definition sets no environment. Don't flip the default
  until Terraform sets it explicitly; `tests/test_app_factory.py` pins this.
- **Uploads are presigned, straight to S3:**
  1. `POST /api/uploads/init` validates the request and mints a PUT URL under
     `uploads/staging/<sub>/<id>`.
  2. The browser PUTs the bytes to S3.
  3. `POST /api/uploads/<id>/complete` enforces the real size, parses the header,
     server-side-copies the object to `mrd_files/<id>`, and inserts the document.

  `.../abort` discards a staged upload. `groupName` (null = private) is
  membership-checked at init and complete. The upload id is the Mongo `_id` and the S3
  key suffix. In production this needs the bucket's CORS rule and the staging
  lifecycle rule (terraform `modules/data`).
- Tests live in `server/tests/`. Add route tests to `test_routes.py`, and anything
  about who can see or change what to `test_access_integration.py` (real MongoDB).
  MRD image arrays are 6-D: `(channels, slice, rows, cols, frequencies, measurements)`.

## Frontend conventions

- **All HTTP goes through `src/api/`** (`client.ts`, `mrdFiles.ts`, `uploads.ts`,
  `groups.ts`, `viewer.ts`, `types.ts`). Lint rejects `axios` imports anywhere else.
  `client.ts` attaches the Cognito ID token. On a 401 or a failed refresh it signs out
  and the app falls back to the guest view. `putToS3` is the one bare-axios call: an
  auth header would break the presigned signature.
- **Sign-in state:** use `useCurrentUser()` from `src/auth/useCurrentUser.ts`. Sign-in
  and sign-out dispatch `AUTH_CHANGE_EVENT` (`src/auth/cognito.ts`); listen for it
  rather than polling. `src/auth/ProtectedRoute.tsx` guards routes.
- **Layout:** features live under `src/features/`: `auth`, `home`, `calculator`,
  `files`, `groups`, `simulator`. Shared pieces go in `src/components/`, `src/layouts/`,
  `src/utils/` and `src/config/`. `MRDLayout` renders the header, so pages must not
  render another one. Sidebar margins come from `src/layouts/layoutConstants.ts`.
- **Not yet moved:** the viewer (`src/pages/viewerpages/`, `src/components/viewer/`,
  `src/components/visualize/`, `src/hooks/useViewerState.ts`) is still on `dev`'s old
  layout and API (`/api/viewer/<id>`, `get_pulse_array`, `get_gradient_array`).
  Reconciling it with `mrs_recon`'s `/arrays` API is #66. Also dead:
  `pages/viewerpages/ViewerPage_v1.tsx` and the empty `pages/reconpages/ReconstructPage.tsx`.
- Cognito ids come from `VITE_COGNITO_*` via `src/config/env.ts`.
- `npm run lint` is **not yet clean** (~37 problems, mostly `no-explicit-any` in the
  viewer, the auth pages and the calculator). Keep new and touched files clean;
  `files/` and `groups/` already are.

## Cautions

- `server/.env.development` holds **temporary** federated AWS credentials: never
  commit it, and rerun `server/setup_aws.sh` when it expires.
- `server/.medcap/` and `server/venv/` are local virtualenvs; ignore them.
- **Known authorization bug:** `DELETE /api/mrd-file` authorizes with the read check,
  so group members can delete each other's files and any signed-in user can delete
  legacy files. It is pinned by two strict-xfail tests in `test_access_integration.py`.
  When the policy is fixed they will fail; remove the markers deliberately.
- `server/app/test_data.py` is a developer script, not a test. It moves to
  `server/scripts/` with `ci/pipelines`.
- CI on `dev` is still the old `pylint.yml`. The real CI and deploy workflows are on
  `ci/pipelines`, and Terraform is on `infra/terraform`; neither is merged yet.

## Status

The `feature/mrs_recon` line is being reconciled into `dev` one area at a time; #67
tracks it. Done: #62 (typed API client with the token), #63 (app shell, one header,
live sign-in state), #64 (file list and groups under `features/`), #65 (presigned
upload with owner and group). Remaining: #66 (viewer), then rebasing
`feature/mrs-pipeline` (the tyger reconstruction pipeline) onto `dev`.
