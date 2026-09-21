# Terraform — MEDCAP/hp-mri

Adopts the existing, hand-built AWS infrastructure. **Nothing here has been
applied.** The whole point of the sequence below is that adoption changes no live
resource: every import PR must plan clean before it merges.

Read `docs/INVENTORY.md` first — it is the enumeration these files were written
against, including eight findings, several of which are security issues you
should act on before any of this ships.

## Layout

```
bootstrap/   state bucket + lock table. Run once, by a human, with local state.
global/      account-wide: GitHub OIDC CI roles, the shared ECR repository.
modules/     network, data, auth, backend-ecs, frontend-cdn, ci-oidc.
envs/prod/   imports the live infrastructure.
envs/dev/    greenfield; does not exist in AWS yet.
```

Separate directories rather than workspaces, deliberately. Prod is imported and
dev is greenfield, so the two will not describe the same resource set for
several PRs. More importantly the scariest failure here is applying a dev change
to live prod: separate directories, state keys and IAM roles make that
structurally impossible, where a mistyped `terraform workspace select` does not.

## The import loop

One resource group per PR. Never batch them.

1. Add the `import` block(s) to `envs/prod/imports.tf`.
2. `terraform plan -generate-config-out=/tmp/gen.tf` and read the generated HCL.
3. Move the meaningful attributes into the module, parameterised. Never ship
   generated config as-is; it emits every default and no variables.
4. `terraform plan` until it reads **`0 to add, 0 to change, 0 to destroy`**.
5. Only then merge and apply. Any actual change ships as a separate follow-up.

**Reviewer rule: a plan under an import PR that shows any `destroy` or `replace`
is a blocker.** `prevent_destroy` is set permanently on the data bucket, the
Cognito pool and the CloudFront distribution, so the worst mistakes fail loudly.

## Order

`bootstrap` → `global` → import `data` → import `auth` → import `frontend-cdn`
→ build the new compute stack → cut over → clean up → then `envs/dev`.

## The production migration, in order

The compute layer is built beside the old one rather than imported, so this is
blue-green: nothing moves until step 6, and step 6 is one variable.

| # | Step | How you know it worked |
|---|---|---|
| 1 | Import the data bucket, user pool, site bucket and distribution (three PRs, see `envs/prod/imports.tf`) | Each plans `0 to add, 0 to change, 0 to destroy`, except the data bucket which adds exactly the CORS and lifecycle rules |
| 2 | Copy the database: `./scripts/rename-mongo-database.sh` | Document counts match; `medcap_dev` untouched and still serving |
| 3 | In Atlas, add a database user for `arn:aws:iam::862065604168:role/hpmri-prod-task` with `readWriteAnyDatabase` | The row exists. It is inert until step 4 creates the role |
| 4 | Apply, building the new stack (cluster `hpmri-prod`, its own ALB, split IAM roles, 1024/2048 on-demand). `api_origin_dns_name` still points at the OLD ALB | `aws ecs describe-services --cluster hpmri-prod` reports a steady, healthy task. Production is untouched |
| 5 | Test the new ALB directly, bypassing CloudFront | `curl -H 'Host: medcap.ai' http://<new-alb-dns>/api/health` returns 200 and `"mode":"production"` |
| 6 | **Cut over:** set `api_origin_dns_name = ""` and apply | `curl https://medcap.ai/api/health` still works, now served by the new stack. This is the only step that touches live traffic |
| 7 | Watch. Rollback is restoring the old value and applying | |
| 8 | Delete the old cluster, service, ALB, security groups, log group, the `medcap_dev` database, the `E1LTBXHERJ8IYX` distribution, and `AmazonS3FullAccess` from `ecsTaskExecutionRole` | Nothing breaks. Bill drops |

Step 3 is the one that silently breaks things if skipped: the new task role is a
principal Atlas has never seen, so the service comes up healthy on its ALB
health check and then fails every request that touches the database.

Step 2 has a gap worth naming: writes landing in `medcap_dev` between the copy
and step 6 do not reach `hpmri_prod`. At ~57 requests a day, mostly reads, pick
a quiet hour and re-run the copy immediately before step 6.

## Before you start

- Terraform 1.9.x (`.terraform-version`, works with tfenv).
- Credentials: `cd server && ./setup_aws.sh`, or `AWS_PROFILE=aws-medcap-psom-PennResearcher`.
- Account `862065604168`, region `us-east-1`.

## Things that will bite you

**The Atlas mapping.** Confirmed: an Atlas database user exists for
`arn:aws:iam::862065604168:role/ecsTaskExecutionRole`, holding the built-in
`readWriteAnyDatabase`. That row *is* production's database credential — the
connection string carries no username or password. Splitting the role (F2)
removes production's database access the moment it applies, unless the new ARN
is registered first.

Add-then-switch, in this order, with no downtime:

1. In Atlas, add a database user for
   `arn:aws:iam::862065604168:role/hpmri-prod-task` with **exactly** the same
   privileges (`readWriteAnyDatabase`). Both ARNs are valid at once, so this
   costs nothing and makes step 2 reversible.
2. Apply the Terraform that switches the task role.
3. Verify: the service reaches steady state and file listing works.
4. Remove the old Atlas user.
5. *Separately*, tighten to `readWrite` on `medcap_dev`. Do not fold this into
   step 1 — changing principal and privileges together means a failure tells
   you nothing about which one caused it.

**Dev needs its own user, and it must be scoped.** `readWriteAnyDatabase` is
cluster-wide, so giving the dev task role the same built-in would let dev write
to production's collections — which defeats the point of the separate
environment. Register `arn:aws:iam::862065604168:role/hpmri-dev-task` with
`readWrite` on `hpmri_dev` only. Until that user exists, dev returns 503 on
every request that touches the database.

**Task definitions are not imported.** Terraform owns one seed revision; CI
registers the rest. The ECS service carries
`lifecycle { ignore_changes = [task_definition, desired_count] }` — the single
most important line in this configuration. Without it, every deploy and every
`terraform apply` undo each other.

**The second CloudFront distribution.** `E1LTBXHERJ8IYX` is enabled and points
at an internal ALB that no longer exists. It has no alias so nothing routes to
it, but it is live and billable. Decide whether it represents intended
architecture before importing it; it is deliberately left out for now.
