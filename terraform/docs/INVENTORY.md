# AWS Resource Inventory — MEDCAP/hp-mri

Read-only enumeration of the live (ClickOps-created) infrastructure, for the
import-first Terraform adoption described in `terraform/README.md`.

- **Account:** `862065604168`
- **Region:** `us-east-1`
- **Profile:** `aws-medcap-psom-PennResearcher` (assumed role `PennResearcher`)
- **Enumerated:** 2026-09-18

Everything below was observed, not assumed. Fields marked `UNKNOWN` were not
determinable.

---

## Import table

| Terraform address | AWS import id | Notes |
|---|---|---|
| `module.frontend.aws_cloudfront_distribution.this` | `EXE6YNQ2JA1MA` | The live one. Alias `medcap.ai` |
| *(see "Do not import")* | `E1LTBXHERJ8IYX` | Second distribution, dangling origin |
| `module.frontend.aws_s3_bucket.site` | `medcap.ai` | Website-hosting bucket |
| `module.frontend.aws_s3_bucket_policy.site` | `medcap.ai` | Public `s3:GetObject` to `*` |
| `module.frontend.aws_s3_bucket_website_configuration.site` | `medcap.ai` | index/error both `index.html` |
| `module.data.aws_s3_bucket.this` | `medcap-data` | Primary research data |
| `module.data.aws_s3_bucket_public_access_block.this` | `medcap-data` | All four blocks true |
| `module.data.aws_s3_bucket_server_side_encryption_configuration.this` | `medcap-data` | AES256, bucket key on |
| `module.auth.aws_cognito_user_pool.this` | `us-east-1_vUo50ofKI` | "User pool - lwrhys", ~21 real users |
| `module.auth.aws_cognito_user_pool_client.web` | `us-east-1_vUo50ofKI/4nvgf7et9f4ui0glr4ddf152r8` | |
| `module.backend.aws_ecr_repository.this` | `medcap-app` | MUTABLE tags |
| `module.backend.aws_ecs_cluster.this` | `mrissim-test1` | Name is a leftover; holds production |
| `module.backend.aws_ecs_service.api` | `mrissim-test1/medcap-app-service-v3` | |
| `module.backend.aws_lb.this` | `arn:aws:elasticloadbalancing:us-east-1:862065604168:loadbalancer/app/medcap-app-public-alb/90bf6b0cc7f07331` | |
| `module.backend.aws_lb_target_group.api` | `arn:...:targetgroup/medcap-app-public-alb-tg/54ad780f7b9939fa` | port 5000, HC `/api/health` |
| `module.backend.aws_lb_listener.https` | *listener ARN — re-read at import time* | 443, ACM cert, forward |
| `module.backend.aws_lb_listener.http` | *listener ARN — re-read at import time* | 80 → redirect |
| `module.backend.aws_cloudwatch_log_group.this` | `/ecs/medcap-app` | **no retention set** |
| `module.network.aws_security_group.alb` | `sg-002ff50931724c392` | |
| `module.network.aws_security_group.service` | `sg-0c52dc46530916103` | |
| `module.frontend.aws_route53_zone` *(or data source)* | `Z07746902LXWEEA7WNLDV` | `medcap.ai.`, public, in-account |
| `module.frontend.aws_acm_certificate` *(data source)* | `arn:aws:acm:us-east-1:862065604168:certificate/8e00f2be-9b29-4be3-9839-41587b8a90fe` | `medcap.ai` + `*.medcap.ai` |
| `aws_iam_openid_connect_provider.github` | `arn:aws:iam::862065604168:oidc-provider/token.actions.githubusercontent.com` | **already exists** |

## Network

VPC `vpc-0a77a847a26f00121`, CIDR `10.128.185.128/25` — not the default VPC, and
small (128 addresses total).

| Subnet | AZ | CIDR | Auto-assign public IP |
|---|---|---|---|
| `subnet-0d5062cc077c10efe` | us-east-1a | 10.128.185.128/27 | false |
| `subnet-0a92b66b82a1bba41` | us-east-1b | 10.128.185.160/27 | false |
| `subnet-08d0a5035dd99648e` | us-east-1a | 10.128.185.192/27 | false |
| `subnet-05ea932d2eafe0a1b` | us-east-1b | 10.128.185.224/27 | false |

No NAT gateways. The ECS service runs in the first two subnets with
`assignPublicIp=ENABLED`.

**Security groups.** ALB `sg-002ff50931724c392`: port 443 from prefix list
`pl-3b927c52` (CloudFront origin-facing) only — correctly locked down; port 80 from
`0.0.0.0/0`, redirect-only. Task `sg-0c52dc46530916103`: port 5000 from the ALB SG
only. This part is well configured.

## Compute

ECS service `medcap-app-service-v3` on cluster `mrissim-test1`:

- Task definition `medcap-app-task-def:13`, `awsvpc`, **4096 CPU / 8192 MiB**
- **Capacity provider `FARGATE_SPOT`, weight 1, desiredCount 1**
- Container `medcap-app`, port 5000. The Terraform seed task definition renames it
  `hpmri-api`, the name the deploy workflow patches
- Image `...ecr.../medcap-app:7caa165f25e1e8e581839d486d9895934170a03d` — tagged by
  **git SHA, not `VERSION`**, so the documented VERSION-tag scheme is not what ships
- `executionRoleArn == taskRoleArn == arn:aws:iam::862065604168:role/ecsTaskExecutionRole`
- **`environment: []` and `secrets: null`** — the container receives no configuration
  at all; it runs on the defaults in `server/config.py` (`medcap-data`,
  `medcap_dev`, the hardcoded Atlas URI) and the image's `FLASK_ENV=production`
- Logs → `/ecs/medcap-app`, awslogs, no retention policy
- Target currently **healthy** (`10.128.185.167:5000`)

## Edge

Distribution `EXE6YNQ2JA1MA` (alias `medcap.ai`, cert as above, root `index.html`):

- Default behavior → S3 website origin, `redirect-to-https`, `Managed-CachingDisabled`
- Ordered behavior `/api/*` → ALB origin, all methods, `Managed-CachingDisabled` +
  `Managed-AllViewer`. **Caching is correctly disabled for the API.**
- Custom error responses: `404 → 200 /index.html` only (no 403 rule — acceptable
  because the origin is an S3 *website* endpoint, which returns 404 for missing keys)
- WAF WebACL attached: `CreatedByCloudFront-f1868bcf-3a73-4c76-b3bc-f2b32bbfa1df`
- CloudFront Function `secureApiForwarding` (LIVE) on `/api/*` viewer-request — see
  Findings

DNS: `medcap.ai. A ALIAS → d1tcqlvp5h0vyf.cloudfront.net`, plus ACM validation and
three DKIM CNAMEs. The zone is in this account, so DNS **can** be Terraform-managed.

---

## Findings

### F1 — The edge `Referer` check is decorative (low)

*Corrected 2026-09-24.* An earlier version of this finding called the `Referer`
check the API's only access control and described an anonymous path to
`DELETE /api/mrd-file`. That was true of the `feature/mrs_recon` code, which has no
authentication, and **false of production**, which runs `dev` (image tag
`7caa165f…`). On that `dev` image the data routes carried `@requires_auth` and
validated a Cognito ID token. Observed on 2026-09-18:

```
curl -H 'Referer: https://medcap.ai/' https://medcap.ai/api/mrd-files         → 401
curl -H 'Referer: https://medcap.ai/' https://medcap.ai/api/mrd-files/public  → 200 (guest route, by design)
```

Current `dev` has since changed the routes: `GET /api/mrd-files` is optional-auth
and returns only public files to guests, and `/api/mrd-files/public` no longer
exists. Every route that returns a full document or changes data still requires a
token (see the API table in the root `CLAUDE.md`).

What remains true: CloudFront Function `secureApiForwarding` rejects `/api/*`
requests whose `Referer` does not contain `medcap.ai`, then injects
`x-origin-verify: MO~g3>!p3N`. `Referer` is client-controlled, the substring test
also passes for `medcap.ai.example.com`, and nothing in the backend reads the
injected header — while its value sits in plaintext for anyone with
`cloudfront:GetFunction`. It filters casual traffic and nothing more. Delete it; the
real control is the token check behind it.

F2 and F3 below stand on their own, but they are no longer reachable by an
anonymous caller — exploiting them needs a valid account.

### F2 — The task role is the execution role, and it has `AmazonS3FullAccess`

`ecsTaskExecutionRole` carries `AmazonECSTaskExecutionRolePolicy` **and**
`AmazonS3FullAccess`, and is used as both the execution role and the task role. The
application therefore has read/write/delete on **every bucket in the account** —
including `upenn-security.aws-medcap-psom`, `epsi-kidney-data`,
`upenn-research.medcap-01.us-east-1` and the CDK assets bucket — not just
`medcap-data`. Split the roles and scope the task role to what the code touches in
`medcap-data`: read/write/delete on `mrd_files/` and `uploads/staging/`, read on the
`MRS/` demo datasets.

### F3 — `medcap-data` has no versioning

`get-bucket-versioning` returns empty. The primary research-data bucket cannot recover
an accidental or malicious delete — by a signed-in user, a buggy deploy, or anything
holding the task role's account-wide S3 access (F2).

### F4 — `medcap-data` has no CORS configuration, which breaks the presigned upload flow

The presigned direct-to-S3 upload on `dev` has the browser `PUT` straight to
`uploads/staging/<sub>/<uploadId>` in the bucket. With no CORS configuration that
request is blocked. **Uploads fail against this bucket until CORS is applied.**
Required: `PUT` allowed from `https://medcap.ai` (and `http://localhost:5173` for
local development against real S3), with `ETag` exposed.

### F5 — The staging lifecycle rule `config.py` relies on does not exist

`server/config.py` documents that a bucket lifecycle rule expires
`uploads/staging/` (which holds `uploads/staging/<sub>/<uploadId>`); the Terraform
rule expires it after a day. `get-bucket-lifecycle-configuration` returns
`NoSuchLifecycleConfiguration`. Abandoned uploads will accumulate and be billed
indefinitely.

### F6 — Production runs a single FARGATE_SPOT task

`desiredCount=1` on `FARGATE_SPOT`. A spot reclamation takes the entire API down with
no second task to absorb it. Either move to on-demand, or raise the count and add
FARGATE as a fallback capacity provider.

### F7 — Second CloudFront distribution points at a deleted ALB

`E1LTBXHERJ8IYX` ("Cloudfront to serve private alb through VPC origin and S3 static
site of medcap.ai") is **enabled and deployed**, with a VPC origin pointing at
`internal-medcap-app-private-alb-779687738`. No such load balancer exists — the only
ALB in the account is the public one. This looks like an abandoned public→private
migration. It has no alias, so nothing routes to it, but it is live and billable.
Decide: finish the migration, or delete it. Do not import it until that is settled.

### F9 — Atlas grants the production role `readWriteAnyDatabase`

Confirmed in the Atlas console (2026-09-21). Two AWS IAM database users exist:

| Atlas user | Purpose | Privileges |
|---|---|---|
| `arn:aws:iam::862065604168:role/ecsTaskExecutionRole` | Production ECS task | `readWriteAnyDatabase` (built-in, only role) |
| A second AWS IAM principal | Local development, via `server/setup_aws.sh` federated credentials | not recorded |

Two consequences.

**The role split (F2) is confirmed dangerous.** This row *is* production's database
credential — the connection string carries no username or password. The moment a task
runs as `hpmri-prod-task`, Atlas sees an unknown ARN and every database request fails.
Add the new ARN as a database user *before* applying the switch; both can exist at
once, so that step is free and makes the switch reversible.

**It also undermines the planned dev/prod isolation.** `readWriteAnyDatabase` is
cluster-wide: it grants read and write on every database except `local` and `config`.
Putting dev in a separate database on the same cluster therefore separates namespaces
but not access — a dev task holding the same role could write to production's
collections. The dev task role must be scoped (`readWrite` on `hpmri_dev`
specifically), not given the built-in.

Scoping production down to `readWrite` on `medcap_dev` is worth doing too, but as a
step of its own *after* the switch is verified. Tightening privileges and changing
principal at the same time means a failure tells you nothing about which change caused
it.

### F8 — Smaller items

- Log group `/ecs/medcap-app` has **no retention** — logs are kept forever. A second
  group `/ecs/medcap-app-task-def-publicALB-8000` looks orphaned.
- Task sizing is 4 vCPU / 8 GiB for a 2-worker gunicorn process.
- ECR tags are `MUTABLE`; the deploy pipeline should pin immutable tags.
- The ECS cluster is named `mrissim-test1` but holds production.
- The site bucket `medcap.ai` has all four public-access blocks **disabled** and a
  public-read policy, because it uses the S3 *website* endpoint. Moving to a REST
  endpoint with CloudFront OAC would let all four be re-enabled.
- No SSM parameters exist for the application (only `FALCON_*` and an Inspector path),
  consistent with the empty task-def `environment`.

---

## Do not import

| Resource | Why |
|---|---|
| `medcap-app-task-def:13` | Terraform owns a seed revision only; CI registers the rest. The service needs `lifecycle { ignore_changes = [task_definition] }` |
| Distribution `E1LTBXHERJ8IYX` | Dangling origin, purpose unresolved (F7) |
| `ecsTaskExecutionRole` as-is | Should be *split* into a scoped exec role + task role, not adopted in its current shape (F2) |
| WAF WebACL | CloudFront-managed (`CreatedByCloudFront-*`); leave to the distribution |
| ACM certificate | Consume as a `data` source; it is DNS-validated and stable |

## Still UNKNOWN

- MongoDB Atlas plan and whether a second cluster/database is affordable for `dev`
  (Atlas is outside AWS; not enumerable from here).
- ~~Which Atlas database user maps to `ecsTaskExecutionRole`~~ — **resolved, see F9.**
- Purpose of buckets `epsi-kidney-data`, `test-perm-mri`, `cdk-mri-assets-*`.
- Whether `E1LTBXHERJ8IYX` represents intended future architecture.
