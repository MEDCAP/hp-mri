# HP-MRI Web App — Known Issues & Tech-Debt Inventory

Snapshot from a full source read on branch `feature/mrs_recon` (June 2026). This is the
input document for the planned frontend rewrite and backend cleanup. **No fixes applied.**

## Runtime bugs (backend)

| # | Issue | Location | Impact |
|---|---|---|---|
| B1 | `get_gradient_from_mrdfile()` is called but defined nowhere | `server/app/viewer/routes.py:64` | `GET /api/viewer/get_gradient_array/<id>` 500s; frontend gradient plot can never load |
| B2 | `UPLOAD_FOLDER` undefined | `server/app/viewer/routes.py:171` | `POST /api/viewer-upload` 500s on any upload |
| B3 | Hardcoded path on a former developer's machine | `server/app/viewer/routes.py:191` | `GET /api/get_imaging_metadata` only ever worked on one laptop |
| B4 | Simulator routes use `@mrds_bp` without importing it; reference undefined `db_simulator` | `server/app/simulator/routes.py` | module would crash on import; blueprint is (luckily) never registered — `GET /api/simulator` called by the frontend doesn't exist |
| B5 | `recon` blueprint written but not registered in `create_app()` | `server/app/__init__.py` vs `server/app/recon/` | `POST /api/recon` unreachable even once implemented |
| B6 | Misplaced/typo'd route `DELETE /api/simluators` inside recon routes | `server/app/recon/routes.py:29` | dead copy-paste of simulator code |
| B7 | Artificial `time.sleep()` calls (0.1–1.0 s per file) faking upload progress | `server/app/mrds/routes.py:110-128` | slows real uploads; misleads about actual work |
| B8 | `GET /api/mrd-file/<id>/download` is `pass` | `server/app/mrds/routes.py:276` | download silently returns nothing |

## Backend structure / debt

- **`data.py` mixes three concerns** (Mongo CRUD, S3 I/O, MRD parsing) in one 273-line
  module; route handlers also reach into `db` directly (`mrds/routes.py` upload/delete).
  No services layer.
- **Global mutable state** in scientific code: `lorn.py` (centers/widths/phases/spect),
  `mrd2recon.py` (experiment globals), `hupc_processing.py` (module-level arrays).
  Non-reentrant and thread-unsafe under gunicorn workers.
- **Hardcoded environment**: S3 prefix `MRS/s_2023041103/` in `hupc_processing.py`;
  Windows output paths in `mrd2recon.py`; CORS origins fixed to localhost in `config.py`
  (production config sets none); Mongo cluster URI hardcoded in both configs.
- **Reconstruction is synchronous by design so far** — no job queue; `mrd2recon` runs
  minutes-long fits that would block/timeout a 60 s gunicorn worker.
- **No auth on the API**: Cognito is purely client-side; every `/api/*` endpoint is open.
- **No backend tests** (only the external submodule has tests); no logging framework
  (`print`/`traceback.print_exc()` only); no caching of expensive S3→numpy extraction.
- **Dead code**: `app/groups/` blueprint (never imported), `app/viewer/utils.py` (empty),
  commented-out CLAHE/OpenCV code, `Flask-Uploads` dependency unused.
- **Type hints sparse**; `requirements.txt` pins `mrd-python==2.0.1` from PyPI which can
  drift from the vendored submodule actually imported (`app.external.python.mrd`).

## Frontend structure / debt

> **STATUS (2026-06-12): RESOLVED.** The refactor described in
> `docs/FRONTEND-REWRITE-PLAN.md` was executed (Phases 0–5). The items below are kept
> for history; current structure is documented in `docs/ARCHITECTURE.md`. Still open on
> the frontend: GIF export is a no-op (UI present, `gif.js.optimized` dep unused),
> reconstruction has no backend call (blocked on backend B5), simulator backend missing
> (B4), no frontend tests, backend does not validate Cognito tokens.

### Oversized multi-responsibility components
| File | Lines | Mixed responsibilities |
|---|---|---|
| `components/UploadModal.tsx` | 660 | drag-drop, validation, progress, errors, completion |
| `pages/mrdpages/RetrievePage.tsx` | 639 | table + sorting + filtering + selection + 3 modals |
| `components/viewer/ViewerSidePanel.tsx` | 597 | display controls + GIF export + screenshot |
| `components/ReconstructModal.tsx` | 554 | param table + validation + nested file selector |

### Duplicated / near-duplicate components
- `FileDetailsPanel.tsx` (327) vs `viewer/FileDetailsModal.tsx` (309) — same metadata, two renderers
- `viewer/PlotComponent.tsx` (213) vs `viewer/ImagingPlotComponent.tsx` (379) — two Plotly wrappers; only the latter is actively used
- ~~`UploadProgressIndicator.tsx` vs `UploadProgressModal.tsx`~~ — investigated during the
  rewrite (June 2026): **not** duplicates; they are the minimized floating indicator and the
  expanded per-file dialog of the same flow, both reachable. Kept.
- Modal boilerplate (Transition/StyledDialog/SectionBox) copy-pasted across all 4+ modals

### Dead / stub code
- `viewer/PlotShiftPanel.tsx` — mostly commented out, imported but unused
- `pages/reconpages/ReconstructPage.tsx` — empty
- `pages/simulatorpages/NewSimulatorPage.tsx` — mostly TODO
- Stub homepages: PublicationPage, ConceptPage, ConvertStorePage, SimulatePage
- Orphan CSS: `researchPage.css`, `solutionPage.css`, `publicationPage.css`

### Architecture gaps
- **No state management layer**: everything is local `useState` + prop drilling;
  `hooks/useViewerState.ts` holds ~30 state variables with per-window suffixes
  (`imageArray1/2/3`, `sliceIndex1/2/3`, …) instead of an array/map of window states.
- **No API client layer**: raw axios calls inline in pages/hooks; no shared error
  handling, no types for responses beyond ad-hoc interfaces, no auth header injection.
- **Cognito pool IDs hardcoded** in `pages/loginpages/cognitoUtils.ts`; no `.env` usage
  at all in the frontend.
- **Inconsistent styling**: MUI theme + 8 plain CSS files + inline `sx`; hardcoded colors
  (`#011F5B`) and pixel layout hacks (`marginLeft: isSidebarOpen ? '520px' : '340px'`).
- **Type safety holes**: `as any` casts (5+), `@ts-expect-error` for `webkitdirectory`.
- **Frontend calls endpoints that don't exist** (`GET /api/simulator`) or are broken
  (gradient array) with errors only logged to console.
- No frontend tests of any kind.

## Infrastructure
- CDK stack defines **no resources**; `LambdaTestStack` references nonexistent
  `server/aws_lambda/`.
- CI = pylint only; no build/test/deploy automation; no ECR push despite VERSION-tag scheme.
- Dev and prod share the same live MongoDB Atlas cluster and S3 bucket (no env isolation).
- `.env.development` credential workflow is manual and expires (re-run `setup_aws.sh`).
