# HP-MRI Web App

Web app for the MEDCAP group (UPenn) to upload, share and view Hyperpolarized MRI
data in the MRD format. React SPA (`hp-mri-frontend/`) + Flask REST API (`server/`).
File metadata lives in MongoDB Atlas; MRD files live in S3.

## Repo layout

- `hp-mri-frontend/src/`
  - `api/` — HTTP functions
  - `auth/` — Cognito session, route guard
  - `features/` — `auth`, `home`, `calculator`, `files`, `groups`, `simulator`
  - `components/`, `layouts/`, `config/`, `utils/`, `types/`
  - viewer: `pages/viewerpages/`, `components/viewer/`, `components/visualize/`,
    `hooks/useViewerState.ts`
- `server/`
  - `app/` — blueprints `mrds`, `viewer`, `groups`, plus `auth.py`, `errors.py`
  - `data.py` — MongoDB and S3 access
  - `config.py`
  - `tests/`
- `terraform/` — AWS infrastructure (not yet applied); see `terraform/README.md`
- `server/app/external/` — git submodule `MEDCAP/mrd-fork` (branch `dev`), the MRD
  library. Read-only here.

## Commands

```bash
git submodule update --init
cd server && ./setup_aws.sh && python run.py          # API on :5000
cd server && pytest                                   # unit tests
docker compose -f docker-compose.test.yml up -d       # local MongoDB for integration tests
cd server && MONGO_TEST_URI=mongodb://localhost:27017 pytest
cd hp-mri-frontend && npm install && npm run dev      # SPA on :5173, /api proxied to :5000
npm run build && npm run lint
```

`MONGO_TEST_URI` must point at a local throwaway server, never Atlas.

## Users and visibility

- **Guest:** not signed in. Sees files whose `groupName` is `"public"`.
- **Signed-in user:** Cognito ID token sent as `Authorization: Bearer <token>`.
  Sees:
  - their own files (`ownerId` = their sub)
  - files in any group they are a member of
  - `"public"` files
  - legacy files that have neither `ownerId` nor `groupName`
- **File visibility** is `groupName`:
  - `null` — private to the owner
  - `"public"` — everyone, guests included
  - a group name — members of that group
- A request with an invalid or expired token is answered 401 on protected routes,
  and treated as a guest on optional-auth routes.

## MRD file document (`mrdfiles` collection)

`_id` (ObjectId), `fileName` (`MID<measurementId>-<protocolName>`), `studyDate`,
`studyTime`, `ownerName`, `ownerId`, `groupName`, `subjectType`, `isReconstructed`,
`protocolName`, `measurementId`, `stationName`, `original_filename`,
`upload_timestamp`, `file_size`, `s3_key` (`mrd_files/<_id>`).

## API

All routes are under `/api`. Errors are `{"error": <string>, "code": <tag>}` from the
`mrds` and `viewer` blueprints, and `{"error": <string>}` from `groups`.
`GET /api/health` → `{status, mode}`.

### Files — `app/mrds/routes.py`

| Route | Auth | Input | Output |
|---|---|---|---|
| `GET /mrd-files` | optional | `?limit` (≤200, default 50), `?skip` (≥0) | List of visible file documents, newest `studyDate`/`studyTime` first. Guests get no `ownerId`, `measurementId`, `stationName`, `original_filename` or `s3_key` |
| `GET /mrd-files/<id>` | required | — | Full document; 404 if not visible |
| `POST /uploads/init` | required | `{filename, fileSize, groupName}` — `.bin`/`.mrd`/`.mrd2`, `fileSize` a positive int ≤ `MAX_UPLOAD_BYTES` (2 GiB), `groupName` null or a group the caller belongs to (else 403) | `{uploadId, uploadUrl, expiresIn}`; no database write |
| (browser) `PUT <uploadUrl>` | presigned | File bytes, `Content-Type: application/octet-stream`, no `Authorization` header | S3 stores it at `uploads/staging/<sub>/<uploadId>` |
| `POST /uploads/<id>/complete` | required | `{filename, groupName}` | 201 `{fileId, s3_key, metadata}`; `ownerId`/`ownerName` come from the token. 404 if nothing was staged; 400 if the stored object exceeds the limit |
| `POST /uploads/<id>/abort` | required | — | 204, always |
| `DELETE /mrd-file` | required | `{ids: [..]}` | `{message, deleted_count, s3_deleted_count, file_results: [{file_id, file_name, status, db_deleted, s3_deleted, error}]}`. Permitted for anyone who can see the file |
| `POST /mrd-files/<id>/share` | required | `{groupName}` (null/`"null"` = private) | `{message}`; owner only, and the target group must include the owner |
| `GET /mrd-file/<id>/download` | required | — | 501 (not implemented) |

### Viewer — `app/viewer/routes.py`

| Route | Auth | Output |
|---|---|---|
| `GET /viewer/<id>` | optional | `{image_array, nmr_labels}`. `image_array` is 6-D `(channels, slice, rows, cols, frequencies, measurements)`, scaled 0–255 |
| `GET /viewer/get_pulse_array/<id>` | optional | `{pulse_data, pulse_phase}` (empty lists if the file has no pulses) |
| `GET /viewer/get_gradient_array/<id>` | optional | `{gx, gy, gz}`, always empty |
| `GET /get_count_datasets/<magnet>` | none | `{numDatasets}`; magnet ∈ `HUPC`, `Clinical`, `MR Solutions` |
| `POST /get_proton_picture/<n>` | none | PNG; body `{magnetType}` |
| `POST /get_hp_mri_data/<n>` | none | Spectral data; `?threshold`, `?magnetType` |
| `POST /viewer-upload`, `GET /get_imaging_metadata`, `GET /get_imaging_matrix` | none | Non-functional |

The `/viewer/*` routes return 404 when the file is not visible to the caller, and 422
when the file has no renderable image data.

### Groups — `app/groups/routes.py` (all require auth)

- `GET /groups`: the caller's groups
- `POST /groups`: body `{name, displayName, description}`. `name` is 3–50 chars of
  `[A-Za-z0-9_-]`; 409 if taken. Returns 201 `{groupId}`, and the creator becomes a
  member and admin.
- `GET /groups/<name>`, `GET /groups/<name>/members`, `GET /groups/<name>/settings`:
  members only
- `PATCH /groups/<name>`: admins; body with any of `displayName`, `description`,
  `properties`
- `DELETE /groups/<name>`: admins; refused while the group has files
- `POST /groups/<name>/members`: any member; body `{userSub}`
- `DELETE /groups/<name>/members/<sub>`: admins, or the member themselves
- `POST /groups/<name>/admins`: admins; body `{userSub}`
- `DELETE /groups/<name>/admins/<sub>`: admins
- `PATCH /groups/<name>/settings`: admins; body with any of `isDiscoverable`,
  `autoApprove` (booleans)
- Invite codes:
  - `POST /groups/<name>/invite-codes`: admins; body with optional `expiresInDays`
    and `maxUses` (positive ints). Returns 201 `{code, expiresInDays, maxUses}`.
  - `GET /groups/<name>/invite-codes`: admins; returns `{inviteCodes}`
  - `DELETE /groups/<name>/invite-codes/<code>`: admins
  - `POST /groups/join-by-code`: body `{code}`; returns `{groupName, displayName}`
- Discovery and join requests:
  - `GET /groups/search?q=`: returns `{groups}` (discoverable groups)
  - `POST /groups/<name>/join-requests`: request to join; auto-approved when the
    group's `autoApprove` is set
  - `GET /groups/<name>/join-requests`: admins; returns `{joinRequests}`
  - `POST /groups/<name>/join-requests/<sub>/approve` and `.../deny`: admins
  - `GET /groups/my-join-requests`: the caller's own; returns `{joinRequests}`
  - `POST /groups/<name>/join-requests/withdraw`: the caller's own

## Frontend features

- **Home** (`/`, `/members`, `/publication`, `/concept`, `/convert-store`,
  `/reconstruction-tools`), home layout
- **MR coil calculator** (`/mr-coil-calculator`), client-side only
- **Sign-in** (`/account`, `/signup`, `/confirm-signup`), Cognito
- **Files** (`/mrd-files`), open to guests:
  - table with search, sort and selection (single-click selects, double-click
    opens); each row shows its visibility (Private / group / Public)
  - details pane; the owner can change visibility (Private / a group / Public)
  - upload: drag-and-drop of `.bin`/`.mrd`/`.mrd2` up to 2 GiB each, 3 in parallel,
    with a visibility picker, per-file progress and cancel
  - batch delete
- **Groups** (`/groups`, `/groups/:groupName`), signed-in only: create, join by
  code, search and request to join, members, admins, invite codes, join requests,
  settings
- **Viewer** (`/viewer`), open to guests:
  - up to 3 image windows with per-window file, channel, slice, metabolite and
    measurement selection
  - pulse waveform plot, concatenation along the measurement axis, screenshot
    export
- **Simulator** (`/simulator`): "coming soon" placeholder. `/simulate` and
  `/new-simulator` redirect to it.
- Every header shows "Welcome, <name>" with Sign Out when signed in, and Sign In
  otherwise.

## Rules

- **Backend errors:** raise `ApiError`/`BadRequest`/`NotFound`/`StorageUnavailable`
  (`app/errors.py`). Never put exception text in a response.
- **Backend identity:** comes from `@requires_auth`/`@optional_auth` via
  `g.user_sub`, `g.user_name` and `g.user_groups`, never from the request body.
- **Database and S3:** through `data.py` (`get_db()`, `get_s3_client()`).
  - Configuration from env: `MONGO_URI`, `MONGO_DB_NAME` (default `medcap_dev`,
    production's database), `S3_BUCKET` (default `medcap-data`), `CORS_ORIGINS`,
    `MAX_UPLOAD_BYTES`, `PRESIGN_EXPIRY_SECONDS`.
- **Frontend HTTP:** only through `src/api/`; lint rejects `axios` imports
  elsewhere.
  - Sign-in state comes from `useCurrentUser()` (`src/auth/useCurrentUser.ts`).
  - Cognito ids come from `VITE_COGNITO_USER_POOL_ID` and `VITE_COGNITO_CLIENT_ID`.
- **Frontend pages:** pages inside `MRDLayout` do not render their own header.
- **Tests:** new or changed routes get tests in `server/tests/`. Visibility and
  permission behaviour is tested in `test_access_integration.py`.
- **Secrets:** never commit `server/.env.development`. It holds temporary AWS
  credentials; regenerate with `server/setup_aws.sh`.
- **Local files:** ignore `server/.medcap/` and `server/venv/`.
