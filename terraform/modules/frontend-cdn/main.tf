/**
 * The SPA bucket and the CloudFront distribution in front of both halves.
 *
 * The single-origin shape is deliberate and already working: the default
 * behaviour serves the static site, and an ordered /api/* behaviour forwards to
 * the backend ALB. That is why src/api/client.ts can keep a relative "/api"
 * baseURL and why there is no browser CORS between the SPA and the API.
 *
 * Caching is disabled on both behaviours, matching the live distribution. For
 * /api/* that is correct and must stay. For the static site it is merely
 * wasteful -- Vite emits content-hashed filenames, so they could be cached
 * immutably at the edge. Changing it is a separate, measurable PR.
 *
 * The live distribution runs a CloudFront Function, secureApiForwarding, on
 * /api/* that rejects requests whose Referer does not contain medcap.ai. It is
 * referenced by ARN (var.api_function_arn) so the imported distribution plans
 * clean, and the function body itself is left unmanaged.
 *
 * Referencing it is not an endorsement. Referer is set by the client, so a
 * single curl flag defeats the check, and the substring test passes for any
 * hostname containing medcap.ai. The real control is the Cognito token check in
 * the backend; this adds nothing to it. See finding F1 in docs/INVENTORY.md. New
 * environments should leave api_function_arn empty.
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

locals {
  s3_origin_id  = "site"
  alb_origin_id = "api"

  # CloudFront's managed policies, by id rather than name because that is what
  # the distribution stores.
  cache_disabled       = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  cache_optimized      = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  origin_request_all   = "216adef6-5c7f-47e4-b989-5492eafa07d3" # Managed-AllViewer
  site_cache_policy_id = var.cache_static_assets ? local.cache_optimized : local.cache_disabled
}

resource "aws_s3_bucket" "site" {
  bucket = var.site_bucket_name
}

/**
 * The site bucket is a *website* endpoint with a public-read policy, which is
 * why all four public-access blocks are off. That is reproduced here because it
 * is what exists; the better shape is a REST endpoint behind an origin access
 * control, which would let all four be re-enabled. Worth doing, but it is a
 * change, so it belongs in its own PR rather than smuggled into an import.
 */
resource "aws_s3_bucket_website_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  index_document {
    suffix = "index.html"
  }

  # A SPA serves its own router from the error document.
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "site_public_read" {
  statement {
    sid     = "PublicReadGetObject"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket     = aws_s3_bucket.site.id
  policy     = data.aws_iam_policy_document.site_public_read.json
  depends_on = [aws_s3_bucket_public_access_block.site]
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  aliases             = var.aliases
  default_root_object = "index.html"
  price_class         = var.price_class
  comment             = var.comment
  web_acl_id          = var.web_acl_arn

  origin {
    origin_id   = local.s3_origin_id
    domain_name = aws_s3_bucket_website_configuration.site.website_endpoint

    # A website endpoint only speaks HTTP, so this must be http-only.
    custom_origin_config {
      origin_protocol_policy = "http-only"
      http_port              = 80
      https_port             = 443
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    origin_id   = local.alb_origin_id
    domain_name = var.alb_dns_name

    custom_origin_config {
      origin_protocol_policy = "https-only"
      http_port              = 80
      https_port             = 443
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = local.site_cache_policy_id
    compress               = true
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = local.alb_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    # Never cache the API.
    cache_policy_id          = local.cache_disabled
    origin_request_policy_id = local.origin_request_all
    compress                 = true

    # Declared so the imported distribution plans clean -- the live behaviour
    # has secureApiForwarding attached here. Modelling it is not an endorsement:
    # see the header and finding F1. Leave api_function_arn empty in any new
    # environment.
    dynamic "function_association" {
      for_each = var.api_function_arn != "" ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = var.api_function_arn
      }
    }
  }

  # Deep links must reach the SPA router rather than S3's 404.
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method             = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.certificate_arn != "" ? "TLSv1.2_2021" : null
    cloudfront_default_certificate = var.certificate_arn == ""
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_route53_record" "alias" {
  count = var.route53_zone_id != "" ? length(var.aliases) : 0

  zone_id = var.route53_zone_id
  name    = var.aliases[count.index]
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.this.domain_name
    zone_id                = aws_cloudfront_distribution.this.hosted_zone_id
    evaluate_target_health = false
  }
}
