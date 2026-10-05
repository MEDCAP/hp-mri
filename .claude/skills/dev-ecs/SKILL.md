---
name: dev-ecs
description: Bring up the dev ECS backend on production data, test a build against it, collect evidence and file a bug report, then tear it down. Use when asked to test on ECS / dev / a deployed stack, reproduce a production bug, or smoke-test an image.
---

# dev-ecs

`scripts/dev-ecs.sh` drives `terraform/envs/dev`: one Fargate task behind an ALB
at `https://api-dev.medcap.ai`, running against **production** MongoDB
(`hpmri_prod`), the `medcap-data` bucket and the production Cognito pool.
Every write is real, and the bucket has no versioning.

## Commands

All are non-interactive. Results go to stdout as JSON, progress to stderr.

| Command | Result |
|---|---|
| `scripts/dev-ecs.sh up [--image <tag>]` | Creates or updates the stack and waits for `/api/health`. Prints `{api_url, cluster, service, image, log_group}`. `--image` takes an ECR tag (a git SHA) and rolls it out. |
| `scripts/dev-ecs.sh status` | Prints service counts and recent events, the last stopped task's reason, health, the running image and `age_hours`. |
| `scripts/dev-ecs.sh logs [--since 15m] [--grep PAT]` | Prints container logs as text. Tracebacks show up here, never in responses. |
| `scripts/dev-ecs.sh smoke [--recon-file <id>]` | Runs the end-to-end check as the test account and saves the result to `.dev-ecs/last-smoke.json`. Exits 1 if any step fails. |
| `scripts/dev-ecs.sh token` | Prints an ID token for the test account. |
| `scripts/dev-ecs.sh report --title T [--issue]` | Writes the status, last smoke run and logs to `.dev-ecs/report-*.md`. `--issue` also files it on GitHub. |
| `scripts/dev-ecs.sh down` | Destroys the stack. |

Ad-hoc requests:

```bash
API=https://api-dev.medcap.ai; TOKEN=$(scripts/dev-ecs.sh token)
curl -sS -H "Authorization: Bearer $TOKEN" "$API/api/mrd-files?limit=5" | jq
```

## Rules

- Write only as the test account, and only to files you created in this
  session. Never delete, share or reconstruct into anyone else's files. The
  smoke script follows this rule already; ad-hoc `curl` must follow it too.
- Uploads stay private (`groupName: null`). Never share a file you made to a
  group or to `"public"`.
- Read-only exploration of other users' visible files is fine.
- Run `scripts/dev-ecs.sh down` when you finish, unless the user said to keep
  the stack up. If `status` shows `age_hours` over 8, mention it.

## When something fails

1. `status`: check `last_stopped_task.stoppedReason` and `service.events` for
   startup failures (image pull, secrets, OOM).
2. `logs --since 30m`: find the traceback for a 5xx. A 503 on every database
   route with healthy `/api/health` means the Atlas user for `hpmri-dev-task` is
   missing.
3. Reproduce with one `curl`, then run `report --title "<symptom>"`.

A bug report contains: the reproducing `curl` (with `$TOKEN`, never the token
value), the expected and actual result, the image tag from `status`, and the
report file. Use `--issue` only when the user asked for an issue.

## One-time setup (human)

- In Atlas, add the AWS IAM role `arn:aws:iam::862065604168:role/hpmri-dev-task`
  with `readWrite` on `hpmri_prod`.
- `scripts/dev-ecs.sh create-test-user <email>` creates the Cognito user and
  stores its password in SSM.
- AWS credentials: `cd server && ./setup_aws.sh`, or set `AWS_PROFILE`.
