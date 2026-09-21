# HP-MRI Web App — Architecture

## System overview

```
┌──────────────────────────────┐
│ React SPA (Vite, port 5173)  │  MUI + Plotly + axios
│ Cognito auth + ID token      │  all HTTP via src/api/ (baseURL "/api")
└───┬──────────────────────┬───┘
    │ REST, JSON           │ presigned PUT — file bytes go
    │                      │ browser → S3 directly, never
    │                      │ through Flask
┌───▼──────────────────┐   │
│ Flask (port 5000,    │   │   app factory: server/app/__init__.py
│ gunicorn in Docker)  │   │   blueprints @ url_prefix="/api":
│  ├─ mrds_bp   (reg.) │   │     file metadata + upload lifecycle
│  ├─ viewer_bp (reg.) │   │     MRD array discovery + legacy magnets
│  ├─ recon_bp  (reg.) │   │     MRS reconstruction (registered, 501 stub)
│  └─ simulator, groups (dead, unregistered)
└───┬──────────────┬───┘   │
    │              │       │
┌───▼──────────┐ ┌─▼───────▼──────────────┐
│ MongoDB Atlas│ │ S3 bucket: medcap-data │
│ db hpmri_prod│ │  uploads/staging/{id}  │  presigned landing zone
│ col mrdfiles │ │  mrd_files/{ObjectId}  │  binary MRD files
│ (MONGODB-AWS │ │  MRS/s_2023041103/...  │  legacy HUPC DICOM/FID
│  IAM auth)   │ └────────────────────────┘
└──────────────┘
MRD parsing everywhere via the YARDL-generated library in
server/app/external/python/mrd (git submodule MEDCAP/mrd-fork#dev).
```

The browser→S3 arrow is load-bearing: because the SPA PUTs directly to the bucket, the
`medcap-data` bucket needs a CORS configuration allowing `PUT` from the site origin
with `ETag` exposed. In production the SPA and API share one origin (CloudFront routes
`/api/*` to the backend ALB), so there is no browser CORS between them.

## REST API

All routes are registered under `url_prefix="/api"`. To regenerate this list:

```bash
cd server && FLASK_APP=run.py flask routes --sort rule
```

### `mrds` blueprint — `server/app/mrds/routes.py`

Owns file metadata and the upload lifecycle.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/mrd-files` | List all files, projected metadata, sorted by studyDate/studyTime desc |
| GET | `/api/mrd-files/<file_id>` | Full metadata for one file (ObjectId) |
| POST | `/api/uploads/init` | Validate filename/owner/size, mint a presigned PUT → `{uploadId, uploadUrl, expiresIn}`. No database write |
| POST | `/api/uploads/<upload_id>/complete` | `head_object` the staged file (this is where the size limit is actually enforced), parse the MRD header, server-side `copy_object` to `mrd_files/{id}`, insert the Mongo doc → `201 {fileId, s3_key, metadata}` |
| POST | `/api/uploads/<upload_id>/abort` | Discard a staged object after a client cancel. Always `204`; anything missed is reaped by the staging lifecycle rule |
| DELETE | `/api/mrd-file` | Batch delete `{ids: [...]}` from S3 + Mongo, per-file result list |
| GET | `/api/mrd-file/<file_id>/download` | Not implemented — returns `501`. (The path previously declared an `<int:>` converter, which would have rejected every real ObjectId.) |

**Upload flow.** `init` mints a URL against `uploads/staging/{ObjectId}` — the upload id
doubles as the eventual Mongo `_id` and S3 key suffix. The browser PUTs the bytes
straight to S3. `complete` promotes the object with a server-side copy, so file bytes
never pass through the Flask process. `MAX_CONTENT_LENGTH` is 1 MiB because the API only
ever receives small JSON bodies; the real size ceiling is `MAX_UPLOAD_BYTES`, checked
against the client-declared size at `init` and against the true object size at
`complete`.

### `viewer` blueprint — `server/app/viewer/routes.py`

Owns MRD array extraction and the legacy per-magnet pipelines.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/viewer/<file_id>/arrays` | Describe every renderable array without bulk data → `{file_id, arrays, unsupported}` |
| GET | `/api/viewer/<file_id>/arrays/<key>` | One named array: descriptor + `value_min`/`value_max` + `data`. Values are **unscaled** — callers set their own colour scale |
| GET | `/api/get_count_datasets/<magnet_type>` | Dataset count; HUPC / Clinical / MR Solutions dispatch |
| POST | `/api/get_proton_picture/<int:n>` | Proton DICOM slice as PNG; HUPC implemented |
| POST | `/api/get_hp_mri_data/<int:n>` | EPSI spectral data with threshold; HUPC implemented, others return 0 |
| POST | `/api/viewer-upload` | DICOM upload. **Broken**: undefined `UPLOAD_FOLDER` |
| GET | `/api/get_imaging_metadata` | Mock imaging dims. **Broken**: hardcoded path on a former developer's machine |

The `/arrays` pair replaced three fixed endpoints (`/viewer/<id>`,
`get_pulse_array`, `get_gradient_array`). Discovery-then-fetch means new MRD stream
types show up in the viewer without a new route, and dropping the old scaling
(everything was multiplied by 255/max of the *first* image, which clipped later
measurements and discarded units) is why `value_min`/`value_max` are returned instead.

### `recon` blueprint — `server/app/recon/routes.py`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/recon` | EPSI reconstruction. Registered, returns `501` until the execution model is decided |

The engine (`app/recon/utils/mrd2recon.py`) is complete as a library and CLI. What
blocks the endpoint is scheduling, not maths: `mrd2recon` runs minutes-long fits and
gunicorn runs with `--timeout 60`, so this needs a job queue rather than a synchronous
handler.

`simulator` and `groups` are dead and unregistered: `simulator/routes.py` decorates
with `@mrds_bp` without importing it and reads an undefined `db_simulator`, so the
module would raise on import. The frontend's `GET /api/simulator` call has no backend.

Health: `GET /api/health` → `{status, mode}`, defined inline in `create_app()` for the
ALB target group.

### Error handling

Every failure leaves the API in one shape, produced by `app/errors.py`:

```json
{"error": "<safe, human-readable message>", "code": "<machine tag>"}
```

Handlers raise; they do not format. `ApiError` and its subclasses (`BadRequest`,
`NotFound`, `StorageUnavailable`) carry client-safe messages; `FileNotFoundError`,
`InvalidId`, `PyMongoError` and botocore's `ClientError` are translated centrally; and
anything unexpected is logged in full server-side while the client is told only that
something went wrong. Returning `str(e)` to the caller — which every handler used to do
— leaked Mongo URIs and S3 keys to an API that has no authentication in front of it.

A database outage therefore surfaces as `503`, not as an empty file list.

### Authentication

`app/auth.py` validates Cognito ID tokens: RS256 pinned, issuer and audience checked,
expiry required, JWKS cached for an hour and refetched once on an unknown `kid` so a
key rotation does not cause an outage. Access tokens are rejected — they pass every
other check but carry no identity claims. The SPA attaches the token through an
interceptor in `src/api/client.ts`.

**Enforcement is off by default** (`REQUIRE_AUTH`). Tokens are validated whenever
present — a malformed one is a 401 rather than a silent downgrade to anonymous — but a
request without one still succeeds, and is logged as `ANONYMOUS`. Those log lines are
the evidence for switching enforcement on; the rollout order is in the module
docstring.

`@require_auth` is already applied to every route that touches the group's data.
`GET /api/health` is deliberately open, because the ALB health check cannot present a
token.

### Known issues

- **Enforcement is not yet on.** Until `REQUIRE_AUTH=true`, the only thing in front of
  the API is a CloudFront Function checking the `Referer` header — which the client
  sets, so one curl flag defeats it. See finding F1.
- **`POST /api/viewer-upload` raises `NameError`** — `UPLOAD_FOLDER` is not defined
  anywhere in the tree.
- **`GET /api/get_imaging_metadata` reads a hardcoded path** on a former developer's
  laptop.
- **The magnet modules do S3 I/O at import time** — `mr_solutions_processing.py:54`
  calls `list_objects_v2` while the module is being imported, so **the app cannot start
  without live AWS credentials and a reachable bucket**. They also hardcode
  `BUCKET_NAME = "medcap-data"` a second and third time, and hold module-level mutable
  state that is not safe across gunicorn workers.
- **No API version prefix**, though the SPA and API deploy independently.
- **`data.py` mixes four concerns** at ~490 lines; the MRD stream-walking half touches no
  database and is the obvious seam.

See `.claude/ARCHITECT.md` for the tracked remediation plan.

### Frontend → API usage

All HTTP goes through `src/api/` — `client.ts` holds the only axios instance
(`baseURL: '/api'`, plus `getApiErrorMessage`), with typed wrappers in `mrdFiles.ts`,
`uploads.ts`, `viewer.ts` (bounded response cache) and `simulator.ts`, and response
types in `types.ts`. The one deliberate exception is `putToS3` in `uploads.ts`, which
uses bare axios because a presigned S3 URL must not carry the API client's config.

`simulator.ts` calls `GET /api/simulator`, which no live backend route serves.

## Backend module map (`server/`)

| Module | Role |
|---|---|
| `run.py` | Entry point: `create_app().run(port=5000)`; gunicorn uses `run:create_app()` |
| `config.py` | `Config` (`S3_BUCKET` and `MONGO_DB_NAME`, both env-overridable, `MAX_CONTENT_LENGTH` 1 MiB, `UPLOAD_STAGING_PREFIX`, `MAX_UPLOAD_BYTES` 2 GiB, `PRESIGN_EXPIRY_SECONDS` 3600) → `DevelopmentConfig` (loads `.env.development`, builds the MONGODB-AWS URI from federated creds, CORS for localhost:5173/3000) / `ProductionConfig` (hardcoded Atlas URI, DEBUG off, **and no CORS origins at all**) |
| `app/__init__.py` | App factory; configures stdout logging, installs the shared error handlers, registers `mrds_bp` + `viewer_bp` + `recon_bp`; creates `app.mongo_client`; `/api/health`. `CORS()` is still called **only** in the development branch |
| `app/auth.py` | Cognito ID-token validation, `@require_auth`, and the `REQUIRE_AUTH` flag |
| `app/errors.py` | Domain exceptions (`ApiError`, `BadRequest`, `NotFound`, `StorageUnavailable`) and `register_error_handlers()` — the single error envelope |
| `data.py` | The data layer, ~490 lines mixing four concerns: Mongo CRUD (`list_all_mrdfiles`, `get_mrdfile_by_id`, `insert_mrdfile_header`, `insert_mrdfiles_batch`, `delete_mrdfiles_by_ids`), MRD header parsing (`read_mrdfile_header`), S3 fetch with a 3-entry `_MRD_BYTES_CACHE` LRU, and MRD stream walking + numpy reshaping (`_walk_mrd_arrays`, `_describe_item`, `_to_image_6d`, `_to_trace_3d`) behind `list_mrd_arrays` / `get_mrd_array`. `get_db()` reads `MONGO_DB_NAME` from config; `get_s3_client()` is the process-wide boto3 client |
| `app/viewer/magnets/hupc_processing.py` | Varian HUPC pipeline: procpar parsing, FID→EPSI FFT, DICOM slice rendering. Hardcoded S3 prefix `MRS/s_2023041103/`; module-level mutable globals |
| `app/viewer/magnets/clinical_processing.py` | Stubs |
| `app/viewer/magnets/mr_solutions_processing.py` | Partial |
| `app/recon/utils/mrd2recon.py` | 1,625-line MRS reconstruction engine (EPSI + 1-pulse): k-space gridding, T2* weighting, FFT, phase correction, Lorentzian fits, metabolite maps, kinetic modeling. Also runnable as a CLI |
| `app/recon/utils/lorn.py` | Lorentzian fitting primitives (global-state based) |
| `app/recon/utils/mrdplot.py` | Diagnostic plots of MRD streams |
| `app/external/` | Git submodule: YARDL-generated MRD library (`python/mrd`: `binary.py` reader/writer, `types.py`, ismrmrd↔mrd and seq↔mrd converters; plus the C++ impl and YAML schemas) |

MRD image arrays are 6-D: `(channels, slice, rows, cols, frequencies, measurements)`.

## Frontend module map (`hp-mri-frontend/src`, post-refactor June 2026)

| Area | Contents |
|---|---|
| `App.tsx` | All routing (15 routes × 3 layouts), version badge |
| `api/` | The only place axios appears — see "Frontend → API usage" above |
| `config/env.ts` | Cognito pool/client IDs from `VITE_COGNITO_*` (hardcoded dev fallbacks; see `.env.example`), plus `uploadConfig` |
| `auth/` | `cognito.ts` (typed SDK wrappers), `ProtectedRoute.tsx` |
| `features/files/` | `RetrievePage`, `UploadPage`, `hooks/` (`useFileList`, `useUpload`), `components/` (FilesTable, FilesToolbar, UploadModal + dropzone/list/progress/completion, DeleteConfirmationDialog, FileDetailsPanel) |
| `features/viewer/` | `ViewerPage`, `hooks/` (`useViewerState` — windows array, `useMRDArrayConcatenation`, `useScreenshot`), `components/` (ImageDisplayWindow, ImagingPlotComponent, PulsePlotComponent, ViewerSidePanel + `sidepanel/` sections, ConcatenationPanel, FileSelector, FileDetailsModal, icons) |
| `features/recon/` | `ReconstructModal`, `ParameterTable`, `reconstructValidation.ts` (backend call still TODO) |
| `features/{home,auth,calculator,simulator}/` | Homepage pages, Cognito pages, MR coil calculator, simulator stubs |
| `components/` | Shared only: `dialogs/AppDialog.tsx` (Transition/StyledDialog/SectionBox), `FileDetailsContent.tsx`, `Sidebar.tsx` |
| `layouts/` | HomePageLayout, MRDLayout, SimpleLayout, headers/footer, `layoutConstants.ts` |
| `utils/format.ts` | Shared date/size/timestamp formatters (single source) |
| `types/mrd.ts` | `MRDFile` + `MongoTimestamp` mirroring the Mongo document |
| `styles/`, `theme.ts` | MUI theme (Penn blue = `secondary.main`) + remaining CSS files |

State management: typed custom hooks per feature (`useFileList`, `useUpload`,
`useViewerState` with a `windows: ViewerWindowState[]` array) — no global store by
design; adding React Query/Zustand later is straightforward. `tsc` strict and eslint
(`no-explicit-any`) are both clean, with zero `as any` or `@ts-expect-error` in the
tree. Keep it that way.

## Data model

Mongo document in `hpmri_prod.mrdfiles` (≈ `types/mrd.ts` `MRDFile`):

```
_id: ObjectId            fileName, original_filename
studyDate, studyTime     ownerName (from Cognito user, sent by frontend)
subjectType, groupName   protocolName, measurementId, stationName
isReconstructed: bool    upload_timestamp, file_size, s3_key
```

S3 layout in `medcap-data`:

```
uploads/staging/{ObjectId}   presigned PUT landing zone, expired by lifecycle rule
mrd_files/{ObjectId}         binary MRD files (s3_key on the Mongo doc)
MRS/s_2023041103/...         legacy HUPC DICOM/FID data
```
