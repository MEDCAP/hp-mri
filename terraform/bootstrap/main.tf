/**
 * Bootstrap: the things every other configuration depends on.
 *
 * Run once, by a human, with local state:
 *
 *   terraform init && terraform apply
 *   # then uncomment backend.tf and:
 *   terraform init -migrate-state
 *
 * That order is the chicken-and-egg resolution: this configuration creates the
 * bucket its own state later lives in.
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
      Project   = "hp-mri"
      ManagedBy = "terraform"
      Component = "bootstrap"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  state_bucket = "medcap-tfstate-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket

  # State is the one thing whose loss cannot be recovered by re-running anything.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    id     = "expire-noncurrent-state"
    status = "Enabled"

    filter {}

    # Keep enough history to recover from a bad apply, not forever.
    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_dynamodb_table" "state_lock" {
  name         = "medcap-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  lifecycle {
    prevent_destroy = true
  }
}

/**
 * GitHub OIDC provider.
 *
 * This already exists in account 862065604168 (see docs/INVENTORY.md), so it is
 * adopted rather than created. If you are standing up a fresh account, delete
 * the import block and apply.
 */
import {
  to = aws_iam_openid_connect_provider.github
  id = "arn:aws:iam::862065604168:oidc-provider/token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # AWS verifies GitHub's certificate chain natively now; the value is kept only
  # because the API still requires the field to be present.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}
