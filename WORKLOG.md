# Worklog — `feature/api-hardening`

Autonomous session, 2026-09-19/20. Branch cut from `feature/mrs_recon` @ `0ada906`.

Read first: `terraform/docs/INVENTORY.md` (live AWS enumeration and findings),
`docs/KNOWN-ISSUES.md` (re-verified backlog), `terraform/README.md` (the import
runbook). `.claude/ARCHITECT.md` holds the original plan and is untracked.

## Ground rules I held to

Nothing outward-facing happened. Deliberately **not** done, because it needs a
human decision or is hard to undo:

- **No `aws` mutations.** No bucket versioning, no CORS, no IAM change, no
  resizing. Discovery was read-only, plus one `curl` against `/api/health`.
- **No `terraform apply`.** The configuration is written and validates; it has
  never been run.
- **No `git push`, no PR, no `gh issue create`.**
- Nothing deployed.

## Commits

| Commit | What |
|---|---|
| `1c59054` | Data layer: dropped the per-call Atlas ping, env-drove `MONGO_DB_NAME`/`S3_BUCKET`, made a DB outage raise instead of returning `[]`, removed the duplicate bucket constant, hoisted the boto3 client |
| `534ba94` | `app/errors.py`: domain exceptions, one error envelope, stdout logging. Stopped returning `str(e)` to unauthenticated callers |
| `e9f4042` | Handlers raise instead of formatting; deduped upload validation; fixed the `<int:file_id>` download converter; magnet dispatch registry; registered `recon_bp` |
| `8fdcd6d` | Corrected `docs/ARCHITECTURE.md`; added `terraform/docs/INVENTORY.md` |
| `6ca960b` | First backend tests |
| `f7d84f3` | Replaced the pylint-only workflow with real CI; added `.pylintrc` |
| `3f76da2` | Terraform: bootstrap, global, six modules, prod imports, dev |
| `dc9d0ac` | Deploy pipelines: terraform plan/apply, backend, frontend, release |
| `96741d5` | Cognito token validation, behind `REQUIRE_AUTH` |
| `62338c7` | Rewrote `KNOWN-ISSUES.md` and `WORKFLOW.md`; prepared `scripts/create-issues.sh` |
| `d9c298a` | Made the app startable without AWS; fixed two app-factory bugs |

## State

- **79 backend tests**, up from zero. `pytest` from `server/`.
- **pylint 8.05**, floor set at 7.5 as a ratchet.
- Frontend `npm run lint` and `tsc -b` clean.
- All four Terraform configurations pass `validate` and `fmt -check` (1.9.8).
- All six workflow files parse.

## What I found that you did not know

The discovery pass turned up more than the plan anticipated. In rough order of
how much they should worry you:

1. **The API's only access control is a spoofable `Referer` check** (F1).
   Verified against `/api/health` only. Chained with 2 and 3 below, an anonymous
   caller who sets one header reaches an unauthenticated `DELETE /api/mrd-file`.
2. **The task role is the execution role and carries `AmazonS3FullAccess`** (F2)
   — account-wide write and delete, not just `medcap-data`.
3. **`medcap-data` has no versioning** (F3). No recovery from a delete.
4. **`medcap-data` has no CORS configuration** (F4), so the presigned upload
   flow on this branch **will fail on deploy**.
5. **The app could not start without AWS credentials** — fixed in `d9c298a`.
6. **Production had no CORS middleware at all** — fixed in `d9c298a`.
7. Production is one `FARGATE_SPOT` task at 4096/8192 serving ~57 requests a day
   at 0.1% CPU and 233 MiB. Right-sizing to on-demand costs *less* than today.
8. A second CloudFront distribution is live, pointing at a deleted ALB (F7).

## Decisions waiting on you

1. **`app/simulator/`** — delete as dead code, or implement `GET /api/simulator`?
   The SPA calls it today and gets a 404.
2. **File the issues.** `./scripts/create-issues.sh --dry-run` prints 31 issues
   across four milestones; drop the flag to create them. Not run, because
   creating that many in a shared org repo while you were away seemed the wrong
   call to make alone.
3. **The Atlas mapping.** Before splitting `ecsTaskExecutionRole` (F2), confirm
   in the Atlas console which database user maps to that role ARN for
   `MONGODB-AWS`. Splitting it blind removes production's database access.
4. **Cluster naming.** The live cluster and service are `mrissim-test1` and
   `medcap-app-service-v3`; the module names them `hpmri-prod`. Importing under
   a different name forces a replace, which means downtime. Either match the
   existing names or plan a migration window. Blocks import group 3.
5. **Turning on `REQUIRE_AUTH`** once the frontend has been shipping tokens long
   enough for the `ANONYMOUS` log lines to go quiet.

## Where the worktree is

`.claude/worktrees/api-hardening`, branch `feature/api-hardening`, 11 commits
ahead of `feature/mrs_recon`.

The same edits also still exist uncommitted in the main checkout at
`/Users/kento/dev/hp-mri` — they were copied here rather than moved, so nothing
was lost if you wanted them there. To discard them:

```bash
cd /Users/kento/dev/hp-mri
git checkout -- docs/ARCHITECTURE.md server/
rm server/app/errors.py
rm -rf terraform
```

## Suggested order from here

1. Read `terraform/docs/INVENTORY.md`.
2. Enable bucket versioning and add the CORS rule — two small, high-value AWS
   changes that unblock the upload flow and make deletes survivable.
3. File the issues.
4. Merge this branch, watch CI, then work the Terraform adoption sequence.
