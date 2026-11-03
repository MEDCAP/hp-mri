/**
 * The WebACL on the production distribution. Created by the CloudFront console,
 * hence the name, which cannot change without replacing the ACL. CLOUDFRONT
 * scope, so it lives in us-east-1, which is this provider's region.
 *
 * Rule order matters: an Allow from any rule ends evaluation, so a managed
 * rule is only ever overridden to Count, never Allow.
 */
resource "aws_wafv2_web_acl" "this" {
  name  = "CreatedByCloudFront-f1868bcf-3a73-4c76-b3bc-f2b32bbfa1df"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWS-RateBasedRule-IP-300-CreatedByCloudFront"
    priority = 0

    # The site gets a few hundred requests a day in total; an IP over 300 in
    # five minutes is a scanner.
    action {
      block {}
    }

    statement {
      rate_based_statement {
        aggregate_key_type    = "IP"
        evaluation_window_sec = 300
        limit                 = 300
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-RateBasedRule-IP-300-CreatedByCloudFront"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAmazonIpReputationList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesAmazonIpReputationList"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Bodies over 8 KB are not an attack by themselves; Count keeps them
        # flowing through the rules below.
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CreatedByCloudFront-f1868bcf-3a73-4c76-b3bc-f2b32bbfa1df"
    sampled_requests_enabled   = true
  }
}

# --- logging ----------------------------------------------------------------

# WAF requires the aws-waf-logs- prefix.
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-hpmri-prod"
  retention_in_days = 30
}

data "aws_iam_policy_document" "waf_log_delivery" {
  statement {
    effect    = "Allow"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.waf.arn}:*"]
    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:*"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_resource_policy" "waf" {
  policy_name     = "aws-waf-logs-hpmri-prod"
  policy_document = data.aws_iam_policy_document.waf_log_delivery.json
}

resource "aws_wafv2_web_acl_logging_configuration" "this" {
  resource_arn            = aws_wafv2_web_acl.this.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  # Bearer tokens are credentials.
  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  depends_on = [aws_cloudwatch_log_resource_policy.waf]
}
