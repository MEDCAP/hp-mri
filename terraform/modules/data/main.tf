/**
 * The research data bucket.
 *
 * Three of the inventory's findings live here, and the defaults below are
 * chosen to close them:
 *
 *   F3  medcap-data has no versioning, so a delete is unrecoverable -- whether
 *       by a signed-in user, a buggy deploy, or anything holding the task role's
 *       account-wide AmazonS3FullAccess. There is no second copy.
 *   F4  it has no CORS configuration, which the presigned direct-to-S3 upload
 *       flow requires. Uploads break the moment that branch deploys.
 *   F5  server/config.py documents a lifecycle rule expiring uploads/staging/
 *       after a day. No such rule exists, so abandoned uploads accumulate.
 *
 * Enabling versioning on import is a real change, not an adoption. Import with
 * versioning_enabled = false so the first plan is clean, then flip it in a
 * follow-up PR whose diff shows exactly that one change.
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

resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  lifecycle {
    # Permanent, not just for the import. This bucket holds the group's
    # research data and there is no second copy.
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

/**
 * CORS for the presigned upload.
 *
 * POST /api/uploads/init returns a presigned PUT and the browser sends the file
 * bytes straight here, cross-origin. ETag has to be exposed because the client
 * reads it back to confirm the object landed.
 *
 * This takes the origins as a plain variable rather than reading the CloudFront
 * module's output, which is what keeps `data -> backend-ecs` and
 * `frontend-cdn -> data` from forming a cycle: Terraform builds its graph per
 * resource, not per module.
 */
resource "aws_s3_bucket_cors_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  cors_rule {
    allowed_methods = ["PUT"]
    allowed_origins = var.cors_allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  # The rule server/config.py already assumes exists.
  rule {
    id     = "expire-abandoned-staging-uploads"
    status = "Enabled"

    filter {
      prefix = var.staging_prefix
    }

    expiration {
      days = var.staging_expiry_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }

  dynamic "rule" {
    for_each = var.versioning_enabled ? [1] : []
    content {
      id     = "expire-noncurrent-versions"
      status = "Enabled"

      filter {}

      noncurrent_version_expiration {
        noncurrent_days = var.noncurrent_version_expiry_days
      }
    }
  }
}

/**
 * Least-privilege access for the application.
 *
 * Today the ECS task runs as ecsTaskExecutionRole with AmazonS3FullAccess
 * attached (finding F2), giving it read/write/delete on every bucket in the
 * account -- including upenn-security.aws-medcap-psom and epsi-kidney-data.
 * This document is what replaces that: the two prefixes the code actually
 * touches, and nothing else.
 *
 * Computed from var.bucket_name alone, with no dependency on the CDN module, so
 * backend-ecs can consume it without creating a cycle.
 */
data "aws_iam_policy_document" "access" {
  statement {
    sid    = "ObjectAccessWithinProjectPrefixes"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
    ]
    resources = [
      "arn:aws:s3:::${var.bucket_name}/${var.files_prefix}*",
      "arn:aws:s3:::${var.bucket_name}/${var.staging_prefix}*",
    ]
  }

  # HeadObject is covered by GetObject, but complete_upload also needs to sign
  # presigned PUTs and copy staging -> mrd_files, both of which are object-level
  # and already granted above.

  statement {
    sid       = "ListOnlyTheProjectPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.bucket_name}"]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.files_prefix}*", "${var.staging_prefix}*"]
    }
  }
}
