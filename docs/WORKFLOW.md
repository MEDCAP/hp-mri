# HP-MRI Web App — Development and Deployment Workflow

## Local development setup

1. **Clone with submodule**
   ```bash
   git clone <repo> && cd hp-mri
   git submodule update --init        # pulls MEDCAP/mrd-fork into server/app/external
   ```
2. **AWS credentials** (needed for S3 + MongoDB Atlas, both use IAM auth)
   ```bash
   cd server && ./setup_aws.sh
   ```
   This runs `aws-federated-auth` (profile `aws-medcap-psom-PennResearcher`) and writes
   temporary `AWS_ACCESS_KEY_ID/SECRET/SESSION_TOKEN` into `.env.development` (chmod 600).
   Credentials expire; re-run when Mongo/S3 auth starts failing.
3. **Backend**
   ```bash
   cd server
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   python run.py                      # Flask dev server on :5000
   ```
   `FLASK_ENV` defaults to `development` → `DevelopmentConfig` (CORS for :5173/:3000,
   MONGODB-AWS URI built from the env file).
4. **Frontend**
   ```bash
   cd hp-mri-frontend
   npm install
   npm run dev                        # Vite on :5173, /api proxied to 127.0.0.1:5000
   ```
   `npm run build` = `tsc -b && vite build`; `npm run preview` serves dist on :3000
   (same `/api` proxy). `npm run lint` runs eslint.

## Versioning

`VERSION` at repo root (currently `2.0.6-preview`) is the single source of truth and is
used as the backend Docker tag (commit b7aae55).

## Docker (backend)

`server/Dockerfile`: multi-stage `python:3.12-slim` build, non-root `appuser`, `libgl1`
for OpenCV, `FLASK_ENV=production`, gunicorn (`--bind 0.0.0.0:5000 --workers=2
--timeout 60`) serving `run:create_app()`.

```bash
cd server
docker build -t medcap-app:$(cat ../VERSION) .
docker run --rm -p 5000:5000 --env-file .env.development medcap-app:$(cat ../VERSION)
```

Note: the image runs `ProductionConfig`, which expects IAM-role-based Mongo auth; running
locally with `--env-file` provides the AWS creds instead.

## CI

`.github/workflows/pylint.yml` — runs pylint on every push (Python 3.12). That is the
**entire** CI/CD surface: no build, no tests, no image push, no deploy.

## Deployment — current state (honest)

Target architecture (implied by the code) vs what exists:

| Piece | Implied target | Actual state |
|---|---|---|
| Backend hosting | ECS/Fargate behind an ALB (`/api/health` comments mention ALB) | **nothing deployed by code**; CDK stack `aws-deploy-cdk/lib/aws-deploy-cdk-stack.js` is empty |
| Lambda experiment | `aws-deploy-cdk/app.js` defines a `LambdaTestStack` from `server/aws_lambda/` | that directory **does not exist** |
| Image registry | ECR push tagged from `VERSION` | no workflow does this |
| Frontend hosting | S3 + CloudFront (typical for Vite SPA) | undecided/not built; only local `vite preview` |
| Domain/TLS | — | none defined |
| Database | MongoDB Atlas `mrd-files.gzajigq.mongodb.net`, MONGODB-AWS auth | **live** (shared by dev and prod) |
| Object storage | S3 `medcap-data` | **live** |
| Auth | Cognito user pool (IDs hardcoded in `cognitoUtils.ts`) | live pool; backend does not verify tokens |

Missing pieces to reach production: CDK resources (ECS service/task, ALB, ECR,
CloudFront+S3 for the SPA, certs), a GitHub Actions build-push-deploy workflow keyed off
`VERSION`, environment-specific config (CORS origins, Mongo DB name) via env vars/secrets.

## Current branch WIP — `feature/mrs_recon`

Goal: server-side MRS reconstruction using the new MRD format.

- Submodule bumped to `c245089` (merge of `feature/add-image-types`): refined image
  types / generic NdArray support in the MRD library.
- `data.py`: `get_image_array_from_mrdfile()` now also collects `ImageUint32` items as
  `spectrum_array` (reconstruction diagnostic plots) alongside the 6-D float image stack.
- `server/app/recon/`: routes fixed to bind `@recon_bp` but the endpoint body is still a
  stub and the blueprint is **not registered** in `app/__init__.py`. The reconstruction
  engine itself (`app/recon/utils/mrd2recon.py`) is complete as a CLI/library.
- Next steps implied by the code: register `recon_bp`, wire `POST /api/recon` to
  `mrd2recon`, decide sync vs job-queue execution (the route docstring sketches an
  S3 → Tyger buffer pipeline), and connect `ReconstructModal.tsx` (frontend TODO) to it.
