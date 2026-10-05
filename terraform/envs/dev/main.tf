/**
 * Development: an ephemeral backend on PRODUCTION data.
 *
 * Brought up to test a build on ECS and destroyed when done
 * (scripts/dev-ecs.sh up / down). Only the compute layer lives here: cluster,
 * service, ALB, roles, logs and a DNS name. It talks to production's MongoDB
 * database (hpmri_prod), data bucket (medcap-data) and Cognito pool (hardcoded
 * in server/app/auth.py), so every write -- upload, share, delete -- is real
 * and the bucket has no versioning to undo it.
 *
 * Nothing here owns production state: the bucket and the SSM secrets are
 * referenced by name, so `terraform destroy` removes only what this root
 * created.
 *
 * One manual step, once, that Terraform cannot do: add
 * arn:aws:iam::862065604168:role/hpmri-dev-task as a MongoDB Atlas database
 * user (MONGODB-AWS) with readWrite on hpmri_prod. The role name is the same on
 * every rebuild, so the Atlas user outlives destroy. Without it the service
 * passes its health check and answers 503 to everything touching the database.
 *
 * There is no CloudFront in front. The ALB accepts HTTPS from
 * var.allowed_cidrs only; run the SPA locally against var.hostname.
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

data "aws_caller_identity" "current" {}

locals {
  name_prefix = "hpmri-dev"
  bucket_name = "medcap-data"

  # Production's parameters, read in place. Building the ARNs as strings keeps
  # their values out of this state, and destroy leaves them alone.
  # ECS refuses to start a task whose secret does not exist, so the Tyger pair
  # is opt-in until /hpmri/prod/TYGER_* are written.
  secret_names = concat(
    ["MONGO_URI"],
    var.tyger_enabled ? ["TYGER_CERT_PEM", "TYGER_SERVICE_PRINCIPAL"] : [],
  )
  prod_secret_arns = {
    for name in local.secret_names :
    name => "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/hpmri/prod/${name}"
  }
}

module "network" {
  source = "../../modules/network"

  name_prefix = local.name_prefix
  create_vpc  = false
  vpc_id      = var.vpc_id
  subnet_ids  = var.subnet_ids
}

# The module admits 443 from CloudFront only; dev has no distribution.
resource "aws_vpc_security_group_ingress_rule" "alb_https_direct" {
  for_each = toset(var.allowed_cidrs)

  security_group_id = module.network.alb_security_group_id
  description       = "HTTPS direct from a tester"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = each.value
}

# The statements modules/data grants prod's task, for the same bucket. The
# bucket itself belongs to envs/prod's state, so it is not instantiated here.
data "aws_iam_policy_document" "s3" {
  statement {
    sid     = "ReadWriteDeleteProjectObjects"
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "arn:aws:s3:::${local.bucket_name}/mrd_files/*",
      "arn:aws:s3:::${local.bucket_name}/uploads/staging/*",
    ]
  }

  statement {
    sid       = "ReadDemoDatasets"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::${local.bucket_name}/MRS/*"]
  }

  statement {
    sid       = "ListBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${local.bucket_name}"]
  }
}

module "backend" {
  source = "../../modules/backend-ecs"

  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                    = module.network.vpc_id
  public_subnet_ids         = var.service_subnet_ids
  service_subnet_ids        = var.service_subnet_ids
  alb_security_group_id     = module.network.alb_security_group_id
  service_security_group_id = module.network.service_security_group_id

  ecr_repository_url = var.ecr_repository_url
  image_tag          = var.image_tag

  cpu    = 512
  memory = 1024

  # An interruption costs nothing here.
  capacity_providers = [{ name = "FARGATE_SPOT", weight = 1, base = 0 }]

  certificate_arn = var.certificate_arn

  s3_bucket_name        = local.bucket_name
  s3_access_policy_json = data.aws_iam_policy_document.s3.json

  mongo_db_name = "hpmri_prod"
  cors_origins  = ["http://localhost:5173"]

  extra_environment = {
    TYGER_SERVER_URL = var.tyger_server_url
  }

  secret_environment    = local.prod_secret_arns
  secret_parameter_arns = values(local.prod_secret_arns)

  log_retention_days = 3

  enable_deletion_protection = false
}

resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = var.hostname
  type    = "A"

  alias {
    name                   = module.backend.alb_dns_name
    zone_id                = module.backend.alb_zone_id
    evaluate_target_health = false
  }
}
