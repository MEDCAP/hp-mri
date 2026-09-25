/**
 * Development.
 *
 * Greenfield -- none of this exists in AWS yet, so there is no imports.tf and
 * the first plan is expected to be all creates. It uses the same modules as
 * prod, with the differences that matter for a low-traffic environment.
 *
 * Two manual steps before this environment works, neither of which Terraform
 * can do:
 *
 *   1. Add module.backend.task_role_arn as a MongoDB Atlas database user with
 *      MONGODB-AWS authentication, scoped to `readWrite` on `hpmri_dev` ONLY.
 *      Do not copy production's `readWriteAnyDatabase`: it is cluster-wide, so
 *      a dev task holding it could write to production's collections, and the
 *      separate database would be namespace isolation with no access control
 *      behind it. Until this user exists, every request returns 503.
 *   2. Create the hpmri_dev database. Prod shares one Atlas cluster, so this is
 *      a second database on it rather than a second cluster.
 *   3. If you want to run dev locally, the developer principal (the second AWS
 *      IAM user in Atlas, used by server/setup_aws.sh) needs access to
 *      hpmri_dev too.
 *
 * Deliberately NOT sharing with prod: the data bucket (dev gets a throwaway one
 * with a couple of seeded files rather than a copy of the research data) and
 * the Cognito pool (the prod pool holds ~21 real researcher accounts and is not
 * a place to test password policies).
 */
terraform {
  required_version = "~> 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "hp-mri"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "hpmri-dev"
}

module "network" {
  source = "../../modules/network"

  name_prefix = local.name_prefix
  # Shares the account's existing VPC. A /25 with no NAT is plenty for one more
  # task, and a second VPC would be cost and wiring for no benefit at this size.
  create_vpc = false
  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids
}

module "auth" {
  source = "../../modules/auth"

  pool_name   = "hpmri-dev"
  client_name = "hpmri-dev-web"

  # Dev can be destroyed and rebuilt; it holds no real accounts.
  deletion_protection = false

  callback_urls = [module.frontend.web_origin]
  logout_urls   = [module.frontend.web_origin]
}

module "data" {
  source = "../../modules/data"

  bucket_name = var.data_bucket_name

  # Correct from the start here, unlike prod where both are follow-ups.
  versioning_enabled   = false
  cors_allowed_origins = [module.frontend.web_origin, "http://localhost:5173"]

  # The only bucket in this project it is ever safe to set this on.
  force_destroy = true
}

module "backend" {
  source = "../../modules/backend-ecs"

  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                    = module.network.vpc_id
  public_subnet_ids         = var.subnet_ids
  service_subnet_ids        = var.service_subnet_ids
  alb_security_group_id     = module.network.alb_security_group_id
  service_security_group_id = module.network.service_security_group_id

  ecr_repository_url = var.ecr_repository_url
  image_tag          = var.seed_image_tag

  # Small on purpose. Prod uses 4096/8192 to serve 57 requests a day at 0.1%
  # CPU; dev has no reason to repeat that.
  cpu    = 512
  memory = 1024

  # Dev is the one place spot genuinely fits: an interruption costs nothing.
  capacity_providers = [{ name = "FARGATE_SPOT", weight = 1, base = 0 }]

  certificate_arn = var.certificate_arn

  s3_bucket_name        = module.data.bucket_name
  s3_access_policy_json = module.data.access_policy_json

  mongo_db_name = "hpmri_dev"
  cors_origins  = [module.frontend.web_origin, "http://localhost:5173"]

  secret_environment    = { MONGO_URI = aws_ssm_parameter.mongo_uri.arn }
  secret_parameter_arns = [aws_ssm_parameter.mongo_uri.arn]

  log_retention_days = 7

  # Nothing here is precious.
  enable_deletion_protection = false
}

module "frontend" {
  source = "../../modules/frontend-cdn"

  site_bucket_name = var.site_bucket_name
  alb_dns_name     = module.backend.alb_dns_name

  # A subdomain under the existing wildcard certificate, so dev needs no new
  # certificate and no validation dance.
  aliases         = var.aliases
  certificate_arn = var.certificate_arn
  route53_zone_id = var.route53_zone_id

  # No Referer function and no WAF. Dev should look like the application's real
  # security posture, not a decorated version of it.
  api_function_arn = ""
  web_acl_arn      = null

  comment = "hp-mri dev"
}

resource "aws_ssm_parameter" "mongo_uri" {
  name  = "/hpmri/dev/MONGO_URI"
  type  = "SecureString"
  value = var.mongo_uri

  lifecycle {
    ignore_changes = [value]
  }
}
