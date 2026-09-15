# HP-MRI Web App — Product Spec (as implemented)

This document describes what the application is **trying to do**, derived from reading the
source on branch `feature/mrs_recon` (June 2026). Each feature carries a status label:

- **working** — implemented end-to-end and usable
- **UI-only** — frontend done, backend missing or stubbed
- **stub** — placeholder code on both sides
- **broken** — code exists but errors at runtime

## Purpose

A web platform for the MEDCAP computing group to manage Hyperpolarized MRI (HP-MRI)
experiment data: upload raw/reconstructed MRD files, browse and share them within the
group, visualize images and spectra interactively, and (in progress) run MRS
reconstruction server-side. It replaces ad-hoc local MATLAB/Python workflows with a
shared, S3-backed store and a browser viewer.

## Domain primer

- **MRD format**: the ISMRM "MRD v2" streaming format, generated from YARDL schemas
  (fork: `MEDCAP/mrd-fork`, vendored as the `server/app/external` submodule). A file is a
  stream of typed items: `Header`, `Acquisition` (raw k-space), `Image*` (Float/Double/
  Uint32/...), `Pulse`, `Gradient`, `Waveform`. Accepted upload extensions: `.bin`,
  `.mrd`, `.mrd2`.
- **Image array shape**: the viewer consumes a 6-D array
  `(channels, slice, rows, cols, frequencies, measurements)`; the frequency axis holds
  metabolite images (labels from `measurement_freq_label` in the image header).
- **Sequences**: *EPSI* (echo-planar spectroscopic imaging — spatial metabolite maps) and
  *1-pulse* (non-localized spectroscopy — metabolite amplitude vs time). The reconstruction
  module (`server/app/recon/utils/mrd2recon.py`) handles both: k-space gridding + FFT +
  phase correction + **Lorentzian peak fitting** (`lorn.py`) of up to ~7 metabolite peaks
  (pyruvate, lactate, etc., specified as ppm offsets), producing per-metabolite images and
  kinetic-model fits (kAB exchange, T1).
- **Magnet types**: the legacy viewer path distinguishes `HUPC` (Varian preclinical,
  FID/procpar + DICOM, fully implemented), `Clinical` (stub), and `MR Solutions` (partial).

## Feature inventory

### MRD file management
| Feature | Status | Where |
|---|---|---|
| Multi-file upload with validation, per-file progress, completion summary | **working** | `UploadModal.tsx`, `POST /api/upload` (`server/app/mrds/routes.py`) — note: progress timing is partly faked with `time.sleep()` |
| Folder upload page | **working** | `pages/mrdpages/UploadPage.tsx` |
| File table: search, sort, multi-select | **working** | `pages/mrdpages/RetrievePage.tsx` (639 lines), `GET /api/mrd-files` |
| File metadata details panel | **working** | `FileDetailsPanel.tsx`, `GET /api/mrd-files/<id>` |
| Batch delete (Mongo + S3) with confirmation | **working** | `DeleteConfirmationDialog.tsx`, `DELETE /api/mrd-file` |
| File download | **stub** | `GET /api/mrd-file/<id>/download` is `pass` |

### Viewer
| Feature | Status | Where |
|---|---|---|
| Multi-window (3) image viewer: per-window file/channel/slice/metabolite/measurement selection | **working** | `pages/viewerpages/ViewerPage.tsx`, `hooks/useViewerState.ts`, `GET /api/viewer/<id>` |
| Heatmap rendering with colorscale/alpha/threshold/contrast controls | **working** | `components/viewer/ImagingPlotComponent.tsx`, `ViewerSidePanel.tsx` |
| RF pulse waveform plot | **working** | `PulsePlotComponent.tsx`, `GET /api/viewer/get_pulse_array/<id>` |
| Gradient waveform plot | **broken** | backend calls undefined `get_gradient_from_mrdfile()` (`server/app/viewer/routes.py:64`) |
| Screenshot export | **working** | html2canvas, client-side (`useScreenshot` hook) |
| GIF export | **UI-only (no-op)** | GIF controls render but the export handler is an empty function; `gif.js.optimized` is a dependency that is never imported |
| Multi-file concatenation along measurement axis | **UI-only** (client-side compute) | `ConcatenationPanel.tsx`, `hooks/useMRDArrayConcatenation.ts` |
| Spectral grid overlay on proton image (legacy magnet workflow) | **working** (HUPC only, hardcoded dataset) | `PlotComponent.tsx`; `POST /api/get_proton_picture/<n>`, `POST /api/get_hp_mri_data/<n>`, `server/app/viewer/magnets/hupc_processing.py` |
| Viewer DICOM upload | **broken** | `POST /api/viewer-upload` references undefined `UPLOAD_FOLDER` |
| Imaging metadata endpoint | **broken** (dev-only) | `GET /api/get_imaging_metadata` loads a hardcoded path on a former dev's machine |

### Reconstruction (active WIP — branch `feature/mrs_recon`)
| Feature | Status | Where |
|---|---|---|
| Reconstruction parameter dialog (metabolite names, ppm offsets, flags, wiggle factor) | **UI-only** | `components/ReconstructModal.tsx` (TODO at line ~241: no request sent) |
| MRS reconstruction engine (EPSI + 1-pulse, Lorentzian fitting, kinetic models) | **implemented as a library/CLI, not wired to any route** | `server/app/recon/utils/mrd2recon.py` (1,625 lines), `lorn.py`, `mrdplot.py` |
| `POST /api/recon` endpoint | **stub** (and the `recon` blueprint is **not registered** in `app/__init__.py`) | `server/app/recon/routes.py` |

### Simulator
| Feature | Status | Where |
|---|---|---|
| Simulator list page | **UI-only** | `pages/simulatorpages/SimulatorPage.tsx` calls `GET /api/simulator` |
| Simulator backend | **broken** | `server/app/simulator/routes.py` decorates with an unimported `mrds_bp` and reads an undefined `db_simulator`; blueprint never registered |
| New-simulator form | **stub** | `NewSimulatorPage.tsx` (mostly TODO) |

### Auth and public pages
| Feature | Status | Where |
|---|---|---|
| AWS Cognito sign-up / confirm / login | **working** | `pages/loginpages/*`, `cognitoUtils.ts` (pool IDs hardcoded) |
| Route protection | **partial** — only `/mrd-files` is wrapped in `ProtectedRoute`; viewer and APIs are open; backend does not validate tokens | `components/ProtectedRoute.tsx` |
| Landing / members / reconstruction-tools pages | **working** (static content) | `pages/homepages/` |
| Publication / Concept / Convert-store / Simulate pages | **stub** (empty shells) | `pages/homepages/` |
| MR coil calculator | **working** (pure client-side) | `pages/calculator/MRCalculatorPage.tsx` |

## Frontend route map (from `src/App.tsx`)

| Route | Layout | Page | Protected |
|---|---|---|---|
| `/` `/members` `/publication` `/mr-coil-calculator` `/concept` `/convert-store` `/reconstruction-tools` `/simulate` | HomePageLayout | marketing/info pages | no |
| `/account` `/signup` `/confirm-signup` | SimpleLayout | Cognito auth pages | no |
| `/mrd-files` | MRDLayout | RetrievePage (file table) | **yes** |
| `/simulator` `/new-simulator` | MRDLayout | simulator pages | no |
| `/viewer` | SimpleLayout | ViewerPage | no |
