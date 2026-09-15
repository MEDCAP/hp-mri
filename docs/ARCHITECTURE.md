# HP-MRI Web App — Architecture

## System overview

```
┌─────────────────────────────┐
│  React SPA (Vite, port 5173)│  MUI + Plotly + axios
│  Cognito auth (client-side) │  /api/* proxied by Vite in dev
└──────────────┬──────────────┘
               │ REST, JSON
┌──────────────▼──────────────┐
│  Flask (port 5000, gunicorn │  app factory: server/app/__init__.py
│  in Docker)                 │  blueprints @ url_prefix="/api":
│   ├─ mrds_bp    (registered)│    file CRUD + upload
│   ├─ viewer_bp  (registered)│    image/pulse/gradient extraction
│   ├─ recon_bp   (NOT reg.)  │    MRS reconstruction (WIP)
│   └─ simulator, groups (dead)
└───────┬──────────────┬──────┘
        │              │
┌───────▼──────┐ ┌─────▼─────────────────┐
│ MongoDB Atlas│ │ S3 bucket: medcap-data │
│ db medcap_dev│ │  mrd_files/{ObjectId}  │  binary MRD files
│ col mrdfiles │ │  MRS/s_2023041103/...  │  legacy HUPC DICOM/FID
│ (MONGODB-AWS │ └────────────────────────┘
│  IAM auth)   │
└──────────────┘
MRD parsing everywhere via the YARDL-generated library in
server/app/external/python/mrd (git submodule MEDCAP/mrd-fork#dev).
```

## REST API

Health: `GET /api/health` → `{status, mode}` (defined inline in `create_app()`).

### `mrds` blueprint — `server/app/mrds/routes.py`
| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/api/mrd-files` | List all files (projected metadata fields) | sorted by studyDate/Time desc |
| GET | `/api/mrd-files/<file_id>` | Full metadata for one file | ObjectId |
| POST | `/api/upload` | Multipart batch upload. Per file: validate ext (`.bin/.mrd/.mrd2`) → parse header (`read_mrdfile_header`) → insert Mongo doc → upload S3 `mrd_files/{id}` → set `s3_key` | returns 200/207/400 with per-file results; contains artificial `time.sleep()` progress simulation |
| DELETE | `/api/mrd-file` | Batch delete `{ids: [...]}` from S3 + Mongo | per-file result list |
| GET | `/api/mrd-file/<int:id>/download` | — | **stub** (`pass`) |

### `viewer` blueprint — `server/app/viewer/routes.py`
| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/api/viewer/<file_id>` | 6-D image array + metabolite labels from MRD in S3 | `{image_array, nmr_labels}` |
| GET | `/api/viewer/get_pulse_array/<file_id>` | RF pulse amplitude + phase | `{pulse_data, pulse_phase}` |
| GET | `/api/viewer/get_gradient_array/<file_id>` | gradients gx/gy/gz | **broken**: calls undefined `get_gradient_from_mrdfile()` |
| GET | `/api/get_count_datasets/<magnet_type>` | Dataset count for legacy magnet workflow | HUPC / Clinical / MR Solutions dispatch |
| POST | `/api/get_proton_picture/<int:n>` | Proton DICOM slice as PNG | magnet dispatch; HUPC implemented |
| POST | `/api/get_hp_mri_data/<int:n>` | EPSI spectral data with threshold | HUPC implemented; others return 0 |
| POST | `/api/viewer-upload` | DICOM upload | **broken**: undefined `UPLOAD_FOLDER` |
| GET | `/api/get_imaging_metadata` | Mock imaging dims | **broken**: hardcoded local path |

### `recon` blueprint — `server/app/recon/routes.py` (NOT registered in `create_app()`)
| Method | Path | Purpose | Notes |
|---|---|---|---|
| POST | `/api/recon` | EPSI reconstruction | **stub**; docstring sketches an S3 → Tyger buffer workflow |
| DELETE | `/api/simluators` (sic) | misplaced simulator code | undefined `db_simulator` |

### Frontend → API usage
`axios` calls are inline in components/hooks (no client layer):
`UploadPage`/`UploadModal` → `POST /api/upload`; `RetrievePage` → `GET /api/mrd-files`,
`DELETE /api/mrd-file`; `useViewerState` → `GET /api/mrd-files`, `/api/viewer/<id>`,
`get_pulse_array`, `get_gradient_array`; `SimulatorPage` → `GET /api/simulator` (no such
backend route is live). No auth headers are sent; the backend does not validate Cognito tokens.

## Backend module map (`server/`)

| Module | Role |
|---|---|
| `run.py` | entry point: `create_app().run(port=5000)`; gunicorn uses `run:create_app()` |
| `config.py` | `DevelopmentConfig` (loads `.env.development`, builds MONGODB-AWS URI from federated creds, CORS for localhost:5173/3000) / `ProductionConfig` (IAM-role URI, DEBUG off). `S3_BUCKET='medcap-data'` |
| `app/__init__.py` | app factory; registers `mrds_bp` + `viewer_bp`; creates `app.mongo_client`; `/api/health` |
| `data.py` | **the data layer (mixed concerns)**: Mongo CRUD (`list_all_mrdfiles`, `get_mrdfile_by_id`, `insert_mrdfile_header`, `delete_mrdfiles_by_ids`), MRD header parsing (`read_mrdfile_header`), S3 download + array extraction (`get_image_array_from_mrdfile` → 6-D stack + `spectrum_array` for Uint32 plot bitmaps, `get_pulse_array_from_mrdfile`) |
| `app/viewer/magnets/hupc_processing.py` | Varian HUPC pipeline: procpar parsing, FID→EPSI FFT, DICOM slice rendering; hardcoded S3 prefix `MRS/s_2023041103/`; module-level mutable globals |
| `app/viewer/magnets/clinical_processing.py` | stubs |
| `app/viewer/magnets/mr_solutions_processing.py` | partial |
| `app/recon/utils/mrd2recon.py` | 1,625-line MRS reconstruction engine (EPSI + 1-pulse): k-space gridding, T2* weighting, FFT, phase correction, Lorentzian fits, metabolite maps, kinetic modeling; also runnable as CLI |
| `app/recon/utils/lorn.py` | Lorentzian fitting primitives (global-state based) |
| `app/recon/utils/mrdplot.py` | diagnostic plots of MRD streams (pulses/gradients/acquisitions/images) |
| `app/external/` | git submodule: YARDL-generated MRD library (`python/mrd`: `binary.py` reader/writer, `types.py`, converters ismrmrd↔mrd, seq↔mrd; plus C++ impl, YAML schemas in `model/`, test data) |

## Frontend module map (`hp-mri-frontend/src`, post-refactor June 2026)

| Area | Contents |
|---|---|
| `App.tsx` | all routing (15 routes × 3 layouts), version badge |
| `api/` | **the only place axios appears**: `client.ts` (shared instance, baseURL `/api`, `getApiErrorMessage`), `mrdFiles.ts`, `viewer.ts` (with pulse-response cache), `simulator.ts`, `types.ts` (typed responses; pulse shapes match `server/data.py`) |
| `config/env.ts` | Cognito pool/client IDs from `VITE_COGNITO_*` env vars (fallbacks for dev; see `.env.example`) |
| `auth/` | `cognito.ts` (typed SDK wrappers), `ProtectedRoute.tsx` |
| `features/files/` | `RetrievePage`, `UploadPage`, `hooks/` (`useFileList`, `useUpload`), `components/` (FilesTable, FilesToolbar, UploadModal + dropzone/list/progress/completion, DeleteConfirmationDialog, FileDetailsPanel) |
| `features/viewer/` | `ViewerPage`, `hooks/` (`useViewerState` — windows array, `useMRDArrayConcatenation`, `useScreenshot`), `components/` (ImageDisplayWindow, ImagingPlotComponent, PulsePlotComponent, ViewerSidePanel + `sidepanel/` sections, ConcatenationPanel, FileSelector, FileDetailsModal, icons) |
| `features/recon/` | `ReconstructModal`, `ParameterTable`, `reconstructValidation.ts` (backend call still TODO) |
| `features/{home,auth,calculator,simulator}/` | homepage pages, Cognito pages, MR coil calculator, simulator stubs |
| `components/` | shared only: `dialogs/AppDialog.tsx` (Transition/StyledDialog/SectionBox), `FileDetailsContent.tsx`, `Sidebar.tsx` |
| `layouts/` | HomePageLayout, MRDLayout, SimpleLayout, headers/footer, `layoutConstants.ts` (sidebar margins) |
| `utils/format.ts` | shared date/size/timestamp formatters (single source) |
| `types/mrd.ts` | `MRDFile` + `MongoTimestamp` mirroring the Mongo document |
| `styles/`, `theme.ts` | MUI theme (Penn blue = `secondary.main`) + remaining CSS files |

State management: typed custom hooks per feature (`useFileList`, `useUpload`,
`useViewerState` with a `windows: ViewerWindowState[]` array) — still no global store by
design; adding React Query/Zustand later is straightforward. `tsc` strict and eslint
(`no-explicit-any`) are both clean; keep them that way.

## Data model

Mongo document in `medcap_dev.mrdfiles` (≈ `types/mrd.ts` `MRDFile`):

```
_id: ObjectId            fileName, original_filename
studyDate, studyTime     ownerName (from Cognito user, sent by frontend)
subjectType, groupName   protocolName, measurementId, stationName
isReconstructed: bool    upload_timestamp, file_size, s3_key
```

S3: binary MRD at `mrd_files/{ObjectId}`; legacy HUPC data under `MRS/s_2023041103/`.
