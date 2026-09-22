# HP-MRI Web App — Known Issues & Tech-Debt Inventory

Re-verified against the working tree on branch `feature/api-hardening`
(September 2026), replacing the June 2026 snapshot. Items the June document
listed that turned out to be fixed are recorded at the bottom rather than
silently dropped.

Infrastructure findings live in `terraform/docs/INVENTORY.md` and are referenced
here by their F-numbers. The adoption plan is `.claude/ARCHITECT.md`.

---

## Security — read this section first

| # | Issue | Status |
|---|---|---|
| **S1** | **The API's only access control is a spoofable `Referer` check.** The CloudFront Function `secureApiForwarding` rejects `/api/*` requests whose `Referer` does not contain `medcap.ai`, then injects `x-origin-verify` — a header the backend never reads. `curl -H 'Referer: https://medcap.ai/'` defeats it, and the substring test also passes for `medcap.ai.example.com`. (F1) | **Mitigated, not closed.** Token validation now exists (`server/app/auth.py`) but enforcement is off pending the rollout in that module's docstring |
| **S2** | **The ECS task role is the execution role, and carries `AmazonS3FullAccess`** — the application has write and delete on *every* bucket in the account, including `upenn-security.aws-medcap-psom` and `epsi-kidney-data`. (F2) | **Open.** Terraform models the split; applying it requires confirming the MongoDB Atlas database-user mapping first, or production loses database access |
| **S3** | **`medcap-data` has no versioning**, so a delete is unrecoverable. With S1 and S2 this is the difference between an incident and permanent loss of research data. (F3) | **Open.** One flag in `terraform/envs/prod/main.tf`; deliberately left off so the import plans clean |
| **S4** | Frontend route protection is partial: only `/mrd-files` is wrapped in `ProtectedRoute`. The viewer is open | Open |

## Blocking a deploy

| # | Issue | Status |
|---|---|---|
| **D1** | **`medcap-data` has no CORS configuration.** The presigned direct-to-S3 upload flow has the browser PUT straight to the bucket, which CORS will block. **Uploads will fail the moment this branch deploys.** (F4) | Open — Terraform adds it; it has not been applied |
| **D2** | The `uploads/staging/` lifecycle rule that `server/config.py` documents does not exist, so abandoned uploads accumulate and are billed forever. (F5) | Open — same |
| **D3** | ~~Importing the ECS cluster and service under sane names forces a replace~~ | **Resolved.** The compute layer is built beside the old one and traffic moves at CloudFront, so the names get fixed with no downtime. Sequence in `terraform/README.md` |

## Runtime bugs (backend)

| # | Issue | Location | Status |
|---|---|---|---|
| B2 | `UPLOAD_FOLDER` referenced but never defined → `POST /api/viewer-upload` raises `NameError` | `app/viewer/routes.py` | Open — now fails loudly with a logged traceback rather than a masked 500 |
| B3 | Hardcoded `.npy` path on a former developer's laptop → `GET /api/get_imaging_metadata` only ever worked on one machine | `app/viewer/routes.py` | Open — same |
| B4 | `simulator/routes.py` decorates with `@mrds_bp` without importing it and reads an undefined `db_simulator`; the module would raise on import | `app/simulator/routes.py` | **Open, needs a decision**: delete as dead code, or implement the `GET /api/simulator` the frontend already calls |
| **B9** | **The magnet modules do S3 I/O at import time** — `mr_solutions_processing.py:54` calls `list_objects_v2` while the module is being imported, so `create_app()` fails outright without live AWS credentials. ECS startup depends on S3 being reachable, and the tests have to stub these modules to run at all | `app/viewer/magnets/` | Open — new, found while writing the test suite |

## Backend structure / debt

- **Reconstruction runs on threads, not a queue.** Closed the 501: the fits run as
  container stages on a tyger cluster and `POST /api/recon` answers `202 {jobId}`,
  so the 60-second gunicorn and ALB timeouts no longer bound the work. What is left
  is durability. The job is advanced by a `threading.Thread` in the web worker, so a
  worker restart abandons it; a read detects that by stage timeout and reports the
  job failed, which is a presentation fix rather than a durable one. AWS Batch or a
  Step Functions-invoked Fargate task is still the right end state.
- **The pipeline images are not pullable.** Every `ghcr.io/medcap/*` image returns
  403 to an anonymous pull and the tyger cluster holds no pull secret for that
  namespace, so a run reaches the cluster, transfers its buffer, and then dies in
  `ImagePullBackOff`. Nothing in the convert or recon path has been verified end to
  end because of this. Push the images or give the cluster a credential.
- **Two codespecs in `mrs_to_mrd/tyger_deploy/` are stale.** `convert_epsi` and
  `convert_spectral` name images with no build target in that repo's Dockerfile and
  pass `--input/--output`, which `MRStomrd2.py`'s parser does not accept. Only
  `convert` is registered here. Each becomes one table row once its image exists.
- **Global mutable state** in `lorn.py`, `mrd2recon.py`, `hupc_processing.py`.
  Non-reentrant and unsafe across gunicorn workers. This is most of the remaining
  pylint gap, and is left visible rather than disabled away.
- **`data.py` mixes four concerns** at ~490 lines: Mongo CRUD, S3 I/O, MRD stream
  walking and numpy reshaping. The ~300 lines of stream walking touch no database
  and are the natural seam.
- **`_MRD_BYTES_CACHE` caps at 3 entries, not bytes**, is per-worker, and is not
  thread-safe.
- **Hardcoded environment**: S3 prefix `MRS/s_2023041103/` in `hupc_processing.py`;
  Windows output paths in `mrd2recon.py`.
- **`ProductionConfig.MONGO_URI` is still hardcoded.** (The Dockerfile's
  `FLASK_ENV=production` is a deliberate default, not a bug: it is overridden by
  `docker run -e` and by the task definition, and a container that lost it should
  not fall back to `DEBUG` on.)
- **No API version prefix**, though the SPA and API deploy independently.
- **Dead code**: `app/viewer/utils.py` (two lines, an unused import, never imported),
  the unused `Flask-Uploads` dependency, and the stray root `package.json` whose one
  dependency the frontend already declares. (`app/groups/` was listed here in June
  and no longer exists.)
- **Two MRD libraries are in use at once.** `data.py` imports the vendored submodule
  (`app.external.python.mrd`) while `recon/utils/mrd2recon.py` and `mrdplot.py` do a
  bare `import mrd`, which resolves to the pinned PyPI `mrd-python==2.0.1`. So this
  is not a dormant dependency to delete -- removing it breaks reconstruction. Unify
  on the submodule first, then drop the pin.

## Frontend

The June 2026 refactor is genuinely complete: `src/api/` is the only place axios
appears, lint is clean, and there are **zero** `as any` or `@ts-expect-error`
occurrences.

| # | Issue | Location |
|---|---|---|
| FE-1 | GIF export is a no-op — the handler is literally `const onExportGif = () => {};` and `gif.js.optimized` is never imported | `features/viewer/ViewerPage.tsx:99` |
| FE-2 | ~~Reconstruction never calls the backend~~ Closed: `ReconstructModal` posts a user-built pipeline to `POST /api/recon` and follows the job stage by stage | `features/recon/` |
| FE-4 | The fitted spectrum shows magnitude only. `data.py` reduces every complex array to its magnitude before shipping it, so `*_global_spect` and its fit arrive as one series and the fit's phase behaviour is invisible. The plot says so in its subtitle rather than inventing an imaginary trace. Fixing it means the viewer endpoints shipping complex arrays as two series | `data.py`, `features/viewer/components/SpectrumPlotComponent.tsx` |
| FE-5 | Metabolite maps arrive flattened. A `(npeaks, nreps, ny, nx)` array comes through the array endpoint with its two leading axes folded into the channel axis, so the component reconstructs `channel = ipeak * nreps + irep` from `peak_names`. A maps array with no `peak_names` meta falls back to a weaker layout. The endpoint should say which axis is which | `data.py`, `features/viewer/components/MetaboliteMapComponent.tsx` |
| FE-6 | The four MRS plot components have never rendered real data, because no file has been reconstructed yet (see the registry issue above). The peak delta labels in particular need a side-by-side against `mrdplot.py --save` on the same file before anyone trusts a number they print | `features/viewer/components/` |
| FE-3 | `SimulatorPage` calls a route that does not exist | `api/simulator.ts` (blocked on B4) |
| FE-4 | Cognito pool and client IDs are hardcoded as fallbacks; remove once every build supplies `VITE_COGNITO_*` | `config/env.ts:9-10` |
| FE-6 | Sign-up and account pages are TODO stubs | `features/auth/` |
| FE-7 | `NewSimulatorPage` is a stub; `MembersPage` ships `'TODO - N/A'` bios | `features/{simulator,home}/` |
| FE-8 | No frontend tests and no test runner configured | `package.json` |

## Infrastructure

Fully enumerated in `terraform/docs/INVENTORY.md`. Beyond S1–S3 and D1–D3:

- **Production runs a single `FARGATE_SPOT` task** — one reclamation takes the
  API down with nothing to absorb it. (F6)
- **Massively over-provisioned**: 4096 CPU / 8192 MiB serving ~57 requests a day
  at 0.1% average CPU and 233 MiB. Right-sizing to on-demand 1024/2048 costs
  *less* than the current spot task and removes F6.
- **A second CloudFront distribution is live** pointing at an internal ALB that
  no longer exists. No alias routes to it, but it is billable. (F7)
- **`/ecs/medcap-app` has no log retention** — logs are kept and billed forever.
- Images are tagged by git SHA, not by `VERSION`, so the documented tag scheme is
  not what ships.
- Dev and prod still share one Atlas cluster and one S3 bucket; `terraform/envs/dev`
  exists but has never been applied.

---

## Fixed since the June 2026 snapshot

| Was | Now |
|---|---|
| B1 — `get_gradient_from_mrdfile()` called but undefined | Route and dead call removed entirely |
| B7 — artificial `time.sleep()` faking upload progress | Upload rewritten as a presigned direct-to-S3 flow |
| B5 — `recon` blueprint never registered | Registered; returns 501 honestly |
| B6 — typo'd `DELETE /api/simluators` inside the recon blueprint | Deleted |
| B8 — download route is `pass`, with an `<int:>` converter that could never match an ObjectId | Converter fixed; returns 501 |
| `except Exception: jsonify({"error": str(e)})` in every handler, leaking internals to unauthenticated callers | Replaced by `app/errors.py` — one envelope, safe messages, tracebacks logged server-side |
| `list_all_mrdfiles` returning `[]` on failure, so an outage read as "you have no files" | Raises; surfaces as 503 |
| `get_db()` pinging Atlas on every call | Removed |
| `S3_BUCKET` defined twice, only the unreachable one configurable | One source, env-overridable |
| DB name `medcap_dev` hardcoded as a function default | Reads `MONGO_DB_NAME` |
| Magnet dispatch if/elif chain repeated in four handlers | One `_MAGNETS` registry |
| Upload validation duplicated across `init` and `complete`, and accepting `fileSize: true` | One `_validated_upload_fields()` |
| No backend tests | 72 tests |
| CI was `pylint $(git ls-files '*.py')` with no dependencies installed and no frontend | Real CI: backend lint + tests, frontend lint + build, image build |
| Frontend debt list (oversized components, duplicated modals, no API layer, `as any` casts) | Resolved by the June refactor; see `docs/ARCHITECTURE.md` |
