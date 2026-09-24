/**
 * Production.
 *
 * Adoption is deliberately split in two.
 *
 * The long-lived, hard-to-replace things are IMPORTED and must plan clean: the
 * data bucket, the Cognito pool holding real accounts, the site bucket, the
 * CloudFront distribution and the DNS record. Those keep their existing names
 * because their names are either immutable (S3) or irrelevant (Cognito is
 * addressed by id).
 *
 * The compute layer is BUILT FRESH alongside the old one, not imported. The
 * live cluster and service are named mrissim-test1 and medcap-app-service-v3,
 * and adopting them under sane names would force a replace anyway -- so rather
 * than import a mess and then mutate it, the new stack is created beside the
 * old and traffic is moved at CloudFront. That also lets the sizing, capacity
 * provider and IAM role split land as part of the build instead of as three
 * more changes to live infrastructure.
 *
 * The cutover is var.api_origin_dns_name: it points at the OLD ALB until you
 * have verified the new one, so the first apply builds without moving traffic.
 * See terraform/README.md for the sequence.
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
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  name_prefix = "hpmri-prod"
  web_origin  = "https://medcap.ai"
}

module "network" {
  source = "../../modules/network"

  name_prefix = local.name_prefix
  create_vpc  = false
  vpc_id      = var.vpc_id
  subnet_ids  = var.subnet_ids
}

module "auth" {
  source = "../../modules/auth"

  # Auto-generated name on the live pool; it must be reproduced verbatim.
  pool_name   = "User pool - lwrhys"
  client_name = "medcap-web"

  callback_urls = [local.web_origin, "${local.web_origin}/account"]
  logout_urls   = [local.web_origin]
}

module "data" {
  source = "../../modules/data"

  bucket_name = "medcap-data"

  # FOLLOW-UP (finding F3): flip to true. The bucket has no versioning today, so
  # a delete -- by a user, a bad deploy, or anything holding the task role -- is
  # unrecoverable. Import first with false so the adoption plan is empty, then
  # enable it in a PR whose whole diff is this line.
  versioning_enabled = false

  # FOLLOW-UP (findings F4/F5): neither of these exists on the live bucket. The
  # CORS rule is required before the presigned upload flow can work at all, and
  # server/config.py already assumes the staging lifecycle rule is in place.
  cors_allowed_origins = [local.web_origin, "http://localhost:5173"]

  force_destroy = false
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

  # Nothing is imported here, so the recommended values apply from the start
  # rather than arriving as a later change. The old task was 4096/8192 on
  # FARGATE_SPOT while using 0.1% CPU and 233 MiB over 14 days; 1024/2048
  # on-demand costs less than that did AND removes the single-spot-task failure
  # mode (finding F6). Module defaults, stated here because they are a decision.
  cpu                = 1024
  memory             = 2048
  capacity_providers = [{ name = "FARGATE", weight = 1, base = 1 }]

  certificate_arn = var.certificate_arn

  s3_bucket_name        = module.data.bucket_name
  s3_access_policy_json = module.data.access_policy_json

  # Renaming this is a data migration, not a config change: production ran
  # against a database literally named medcap_dev. Run
  # scripts/rename-mongo-database.sh BEFORE applying this, or the service comes
  # up pointed at a database that does not exist yet.
  mongo_db_name = "hpmri_prod"
  cors_origins  = [local.web_origin]

  secret_environment = {
    MONGO_URI = aws_ssm_parameter.mongo_uri.arn
  }
  secret_parameter_arns = [aws_ssm_parameter.mongo_uri.arn]

  log_retention_days = 30
}

module "frontend" {
  source = "../../modules/frontend-cdn"

  site_bucket_name = "medcap.ai"

  # THE CUTOVER. While this is set, /api/* still goes to the old ALB, so the
  # new stack can be built and tested without touching live traffic. Setting it
  # to "" moves production onto the new ALB, and is the only change in that
  # apply. Reverting it is the rollback.
  alb_dns_name    = var.api_origin_dns_name != "" ? var.api_origin_dns_name : module.backend.alb_dns_name
  aliases         = ["medcap.ai"]
  certificate_arn = var.certificate_arn
  route53_zone_id = var.route53_zone_id
  web_acl_arn     = var.web_acl_arn

  # Present so the import plans clean. It is a Referer check, not access
  # control -- see finding F1.
  api_function_arn = var.api_function_arn
}

/**
 * The Mongo connection string, which config.py hardcodes today.
 *
 * The value is supplied out of band (terraform apply -var, or written once by
 * hand) and then ignored, so that rotating it in the console is not reverted by
 * the next apply and so it never lands in a committed tfvars file.
 */
resource "aws_ssm_parameter" "mongo_uri" {
  name  = "/hpmri/prod/MONGO_URI"
  type  = "SecureString"
  value = var.mongo_uri

  lifecycle {
    ignore_changes = [value]
  }
}
