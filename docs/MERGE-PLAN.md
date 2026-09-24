# Merge plan — reconciling two divergent lines onto `dev`

Written 2026-09-24. Every fact below was checked against the repository.

**Read the first section before planning any of this.** The work is not "merge
some feature branches"; `dev` and the `mrs_recon` line have diverged
substantially and both are actively developed.

## The actual state

```
                 717e715 (common ancestor)
                    │
     ┌──────────────┴───────────────┐
     │                              │
  dev == main (7caa165)      feature/mrs_recon (0ada906)
  10 commits                 6 commits — frontend refactor, presigned upload
  +3975/-1165 frontend            │
  +2079/-351  backend             └─ feature/api-hardening (9738651)  15 commits
  · groups feature                      │
  · guest / public datasets             └─ feature/mrs-pipeline (565dd57)  21 commits
  · Cognito JWT auth
  · react-joyride tutorial
  · dependabot
```

`dev` is **not** a stale branch. Since the common ancestor it has gained a groups
feature (`server/app/groups/`, `server/migrations/add_groups.py`), guest access
to public datasets, Cognito JWT validation, a react-joyride tutorial, and
dependabot — 42 files, ~6,000 insertions.

Meanwhile the `mrs_recon` line rebuilt the frontend (`src/pages/` +
`src/components/` → `src/features/`), replaced the upload with a presigned flow,
then gained the infrastructure/test/auth work and the tyger pipeline on top.

A naive merge produces **16 conflicts**: 13 in the frontend, 3 in the backend.

## Three collisions that need a decision, not a resolution

These are not textual conflicts. Both sides built the same thing twice.

### C1 — Two `server/app/auth.py`

| | `dev` | `api-hardening` |
|---|---|---|
| Decorator | `requires_auth` | `require_auth` |
| Config | Module-level constants | `app.config`, env-driven |
| JWKS | `PyJWKClient` | Manual fetch, cached 1h, refetch on unknown `kid` |
| Rollout | Hard 401 immediately | `REQUIRE_AUTH` flag, staged, logs `ANONYMOUS` |
| Access tokens | Accepted | Rejected — they carry no identity claims |
| Errors | Own JSON shape | Shared error envelope |
| Tests | None | 30 |
| Groups | Reads `cognito:groups` | Not aware of groups |
| Status | **Presumably deployed and working** | Never run against real Cognito |

Neither is strictly better. `dev`'s is integrated with a live feature; mine is
more careful about rollout and better tested. **Recommendation:** keep `dev`'s
behaviour and file, port the parts of mine that are genuinely additive — the
`REQUIRE_AUTH` staging flag, access-token rejection, JWKS rotation handling, and
the 30 tests. Do not merge two modules into one file by hand; pick one and
port deliberately.

### C2 — Two `server/data.py`

`dev` added ~843 lines for groups and guest access. `api-hardening` rewrote
`get_db()`, `list_all_mrdfiles()`, the S3 client and the bucket constant. They
touch the same functions.

Note `dev` still has the bug this line removed:

```python
def get_db(db_name="medcap_dev"):
    client.admin.command('ping')      # a round trip on every call
```

**Recommendation:** take `dev` as the base (it has more feature surface) and
re-apply the four `api-hardening` fixes onto it: drop the ping, read
`MONGO_DB_NAME` from config, stop returning `[]` on failure, and use one shared
S3 client. Each is small and independently verifiable.

### C3 — `app/groups/` is live on `dev`

`docs/KNOWN-ISSUES.md` on this branch lists `app/groups/` as dead code to
delete. **That is wrong relative to `dev`**, where it is a registered blueprint
behind a real feature. The claim was true of the `mrs_recon` line only. Correct
it before anyone acts on it.

## Recommended order

Reconciliation first. Splitting `api-hardening` into themed branches is worth
doing, but it is the *last* problem here, not the first.

### Phase 1 — Reconcile the frontend (the expensive part)

`dev` made ~4,000 lines of changes to files the refactor deleted or moved. The
refactored layout is the intended future — it is documented in
`docs/FRONTEND-REWRITE-PLAN.md` and the pipeline branch is built on it — so it
wins, and `dev`'s features get ported into it.

```bash
git switch -c integrate/frontend dev
git merge feature/mrs_recon
```

Resolve by taking the refactored side for every `modify/delete` conflict, then
re-applying `dev`'s features in their new homes. The features to port, from
`dev`'s log:

- create group and group filtering
- guest access / public datasets
- react-joyride tutorial
- display panes, double-click selection, single-click selection
- padding and header changes

This is real work and should be reviewed by whoever wrote those features. It is
also the one step that cannot be automated away.

### Phase 2 — Reconcile the backend

Three files: `server/data.py`, `server/app/mrds/routes.py`,
`server/app/viewer/routes.py`, plus the `auth.py` decision from C1.

Take `dev` as the base and port forward, in this order, each its own commit:

1. `get_db()` — drop the per-call ping, read `MONGO_DB_NAME` from config
2. `list_all_mrdfiles()` — raise instead of returning `[]`
3. One shared S3 client; delete the duplicate `S3_BUCKET`
4. `app/errors.py` — the shared envelope, and strip the per-route
   `except Exception: str(e)`
5. Auth per C1

### Phase 3 — Land the independent work

Only after phases 1 and 2 is the stack meaningful. These three branch from the
reconciled `dev` and are genuinely separable, because they touch files `dev` has
never had:

| Branch | Contents | Conflicts with `dev` |
|---|---|---|
| `infra/terraform` | `terraform/`, `scripts/` | None — neither directory exists on `dev` |
| `ci/pipelines` | `.github/`, `.pylintrc` | Only `.github/workflows/pylint.yml`, which is deleted |
| `backend/api-tests` | `server/tests/`, `docker-compose.test.yml` | None — `dev` has no tests |

Cherry-pick, in order:

```bash
git switch -c infra/terraform dev
git cherry-pick -n 8fdcd6d && git restore --staged --worktree docs/ && git commit
git cherry-pick 3f76da2 12f9dcc
git cherry-pick -n 9738651 && git restore --staged --worktree server/ .github/ docs/ && git commit

git switch -c ci/pipelines dev
git cherry-pick f7d84f3 dc9d0ac

git switch -c backend/api-tests <reconciled-dev>
git cherry-pick 6ca960b 36fc235
```

`backend/api-tests` must come after phase 2 — the tests assert the reconciled
behaviour. `infra/terraform` and `ci/pipelines` can go in immediately, in
parallel with phase 1.

**Ordering trap found while verifying this:** `12f9dcc` edits
`terraform/docs/INVENTORY.md`, which `8fdcd6d` creates. Pick `8fdcd6d` first or
it conflicts. `12f9dcc` also touches `WORKLOG.md`, which should be dropped —
it is a session narrative, not a repository artifact.

### Phase 4 — The pipeline branch

```bash
git branch -m feature/mrs-pipeline feature/recon-pipeline
git rebase --onto <reconciled-dev> 9738651 feature/recon-pipeline
```

21 commits replayed. Expect conflicts wherever phase 2's resolution differs from
what they were written against. If it turns ugly, merge instead of rebase — one
resolution rather than twenty-one.

## Renaming

The repo mixes `feature/mrs_recon` (underscore) with `feature/mrs-pipeline`
(hyphen). Standardising on hyphens, with a prefix that says what kind of change
it is:

| Now | Becomes |
|---|---|
| `feature/mrs_recon` | *(deleted — contained in `api-hardening`)* |
| `feature/api-hardening` | *(split into `infra/terraform`, `ci/pipelines`, `backend/api-tests`, plus phase-2 commits)* |
| `feature/mrs-pipeline` | `feature/recon-pipeline` |
| `feature/mrs-pipeline-{be,fe}` | *(deleted — already merged into their integration branch)* |

All four are **unpushed**, so renaming and rewriting costs nothing. Only
`feature/mrs_recon` exists on the remote.

## Before any of it

Ten open Dependabot PRs, two of which will fight this work:

- **`react-router-dom` 6.26 → 7.13** — a major, and `App.tsx` is already one of
  the 16 conflicts
- **`axios` 1.7.7 → 1.13.6** — `src/api/client.ts` gains an auth interceptor

Land or defer those deliberately. Taking them mid-reconciliation turns a hard
merge into an intractable one.

## Honest summary

Phase 3 is a few hours. Phase 1 is the real cost, and it is unavoidable: two
people refactored and extended the same frontend in parallel for months without
merging. The lesson for the parallel-sessions question is the same one this repo
just demonstrated twice — **long-lived branches that touch the same files must
be merged continuously, or reconciled expensively later.**
