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

   Needed to reach real data, but no longer needed merely to *start* the app: S3
   access is resolved on first use, so `create_app()` and the whole test suite work
   with no credentials present.
3. **Backend**
   ```bash
   cd server
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   python run.py                      # Flask dev server on :5000
   pytest                             # 79 tests, no AWS or Mongo needed
   ```

   **Testing write logic.** Those 79 mock the database. To exercise the write
   path in `data.py` for real, start a throwaway MongoDB and set one variable:

   ```bash
   docker compose -f ../docker-compose.test.yml up -d
   MONGO_TEST_URI=mongodb://localhost:27017 pytest   # 101 tests
   ```

   Each test creates a uniquely named database and drops it in teardown. Never
   point `MONGO_TEST_URI` at Atlas — the isolation these tests rely on is that
   they can destroy everything they touch. CI runs them against a `mongo:7`
   service container on every PR.

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

## Configuration

Read from the environment, with defaults that suit local development:

| Variable | Default | Notes |
|---|---|---|
| `FLASK_ENV` | `development` (`production` in the image) | An unrecognised value is now a startup error rather than a silent no-config |
| `MONGO_URI` | — | Built from federated credentials in dev; a SecureString SSM parameter in deployed environments |
| `MONGO_DB_NAME` | `hpmri_dev` | Defaults to **dev** so an unconfigured run cannot write to production. Deployed environments set it explicitly |
| `S3_BUCKET` | `medcap-data` | |
| `MAX_UPLOAD_BYTES` | 2 GiB | Checked at `init` against the declared size and at `complete` against the real object |
| `PRESIGN_EXPIRY_SECONDS` | 3600 | Dies with the session token when signing with federated credentials |
| `REQUIRE_AUTH` | `false` | Enforcement of Cognito token validation. See `server/app/auth.py` for the rollout order |
| `COGNITO_REGION` / `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | live pool | |

Frontend: `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, optional
`VITE_API_BASE_URL` (defaults to the relative `/api`). See `.env.example`.

## Versioning

`VERSION` at repo root is the single source of truth. `release.yml` refuses any `v*`
tag that does not match it, which is what makes it load-bearing rather than decorative.

Note the live task definition runs an image tagged by **git SHA**, not by `VERSION` —
the pipeline below fixes that, but the currently-deployed image predates it.

## Docker (backend)

`server/Dockerfile`: multi-stage `python:3.12-slim`, non-root `appuser`, `libgl1` for
OpenCV, gunicorn (`--bind 0.0.0.0:5000 --workers=2 --timeout 60`) serving
`run:create_app()`.

```bash
cd server
docker build -t medcap-app:$(cat ../VERSION) .
docker run --rm -p 5000:5000 --env-file .env.development medcap-app:$(cat ../VERSION)
```

The image sets `ENV FLASK_ENV=production` as a **default**, which `docker run -e` and
an ECS task definition both override. It stays deliberately: a container that loses the
variable must not fall back to `DevelopmentConfig` and serve traffic with `DEBUG` on.
To run the image against dev config, pass it explicitly:

```bash
docker run --rm -p 5000:5000 -e FLASK_ENV=development --env-file .env.development \
  medcap-app:$(cat ../VERSION)
```

There is also a `HEALTHCHECK`, so `docker ps` reports whether the app is actually
serving rather than merely running.

## CI

`.github/workflows/`:

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | PR, push to main | Backend pylint + pytest, frontend lint + build, backend image build (no push). On main, deploys dev |
| `terraform.yml` | PR touching `terraform/**` | Plans dev and prod with a read-only role, posts the plan as a PR comment. Applies on main behind environment gates |
| `deploy-backend.yml` | called / manual | Build → ECR → patch the live task definition's image → roll the service → smoke test |
| `deploy-frontend.yml` | called / manual | Build with env-specific `VITE_*` → `s3 sync` → CloudFront invalidation |
| `release.yml` | `v*` tag | Guards the tag against `VERSION`, then deploys prod |

**Prerequisites none of this runs without:**

1. `MRD_FORK_DEPLOY_KEY` — a read-only deploy key on `MEDCAP/mrd-fork`. `.gitmodules`
   uses an SSH URL, which `actions/checkout` cannot authenticate with its `token`
   input, so the image build fails without it.
2. `terraform/global` applied, so the OIDC roles exist.
3. `dev` and `prod` GitHub Environments, with `SITE_BUCKET`, `CF_DISTRIBUTION_ID`,
   `PUBLIC_BASE_URL` and `VITE_COGNITO_*` set from the Terraform outputs. Put required
   reviewers on `prod`.

Release policy: **merging to main ships dev; prod ships on a `v*` tag and a human
approval.**

## Infrastructure

Live, and hand-built. `terraform/` adopts it; `terraform/docs/INVENTORY.md` is the
enumeration, and `terraform/README.md` is the runbook. **Nothing has been applied yet.**

| Piece | State |
|---|---|
| Domain | `medcap.ai`, Route53 zone in-account, ACM cert covering the apex and `*.medcap.ai` |
| Frontend | S3 website bucket `medcap.ai` behind CloudFront `EXE6YNQ2JA1MA` |
| Backend | ECS Fargate service `medcap-app-service-v3` on cluster `mrissim-test1`, behind `medcap-app-public-alb`, reached via a `/api/*` CloudFront behaviour |
| Registry | ECR `medcap-app` |
| Database | MongoDB Atlas, MONGODB-AWS auth against the ECS task role |
| Object storage | S3 `medcap-data` |
| Auth | Cognito pool `us-east-1_vUo50ofKI` (~21 users) |

Read `terraform/docs/INVENTORY.md` before touching any of it. The findings there
include an unauthenticated API behind a spoofable `Referer` check, a task role holding
`AmazonS3FullAccess`, and a data bucket with no versioning — and, more immediately,
**the data bucket has no CORS configuration, so the presigned upload flow will fail
the moment this branch deploys.**

## Current branch WIP — `feature/api-hardening`

Cut from `feature/mrs_recon`. Backend error handling, configuration, tests, CI,
Terraform and token validation. See `WORKLOG.md` for the commit-by-commit account and
the decisions still waiting on a human.
