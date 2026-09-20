/**
 * Production.
 *
 * Every value here is set to match what already exists, so that adoption plans
 * clean. Improvements go in follow-up PRs where the diff shows exactly the one
 * thing changing -- see the notes marked FOLLOW-UP.
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
  # a delete is unrecoverable -- and the API that can issue one is
  # unauthenticated. Import first with false so the adoption plan is empty, then
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
  container_name     = "medcap-app"

  # FOLLOW-UP (finding F6 and the utilisation measurements): the live task is
  # 4096/8192 on FARGATE_SPOT while using 0.1% CPU and 233 MiB. These values
  # match production so the import is clean; the module defaults (1024/2048 on
  # on-demand) are the recommendation, and cost less than this does today.
  cpu                = 4096
  memory             = 8192
  capacity_providers = [{ name = "FARGATE_SPOT", weight = 1, base = 0 }]

  certificate_arn = var.certificate_arn

  s3_bucket_name        = module.data.bucket_name
  s3_access_policy_json = module.data.access_policy_json

  # The production database is, genuinely, named medcap_dev. Renaming it is a
  # data migration, not a config change.
  mongo_db_name = "medcap_dev"
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
  alb_dns_name     = module.backend.alb_dns_name
  aliases          = ["medcap.ai"]
  certificate_arn  = var.certificate_arn
  route53_zone_id  = var.route53_zone_id
  web_acl_arn      = var.web_acl_arn

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
