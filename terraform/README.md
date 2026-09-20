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

`bootstrap` → `global` → prod `data` → `auth` → `network` + `backend-ecs` →
`frontend-cdn` → then `envs/dev`.

## Before you start

- Terraform 1.9.x (`.terraform-version`, works with tfenv).
- Credentials: `cd server && ./setup_aws.sh`, or `AWS_PROFILE=aws-medcap-psom-PennResearcher`.
- Account `862065604168`, region `us-east-1`.

## Things that will bite you

**The Atlas mapping.** `ecsTaskExecutionRole` is what MongoDB Atlas trusts for
`MONGODB-AWS` authentication. Finding F2 says to split it into a real execution
role and a scoped task role — correct, and it will take production's database
access away the moment you do, unless you first add the new task role ARN as an
Atlas database user. Confirm the current mapping in the Atlas console before
touching that role.

**The dev environment needs the same thing.** A new dev task role means a new
Atlas database user. Until that exists, dev returns 503 on every request.

**Task definitions are not imported.** Terraform owns one seed revision; CI
registers the rest. The ECS service carries
`lifecycle { ignore_changes = [task_definition, desired_count] }` — the single
most important line in this configuration. Without it, every deploy and every
`terraform apply` undo each other.

**The second CloudFront distribution.** `E1LTBXHERJ8IYX` is enabled and points
at an internal ALB that no longer exists. It has no alias so nothing routes to
it, but it is live and billable. Decide whether it represents intended
architecture before importing it; it is deliberately left out for now.
