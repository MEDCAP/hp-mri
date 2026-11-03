/**
 * The WebACL on the production distribution. Created by the CloudFront console,
 * hence the name, which cannot change without replacing the ACL. CLOUDFRONT
 * scope, so it lives in us-east-1, which is this provider's region.
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

    action {
      count {}
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

        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            allow {}
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

  rule {
    name     = "AWS-AWSManagedRulesBotControlRuleSet"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            enable_machine_learning = false
            inspection_level        = "COMMON"
          }
        }

        rule_action_override {
          name = "CategoryAdvertising"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryArchiver"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryContentFetcher"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryEmailClient"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryHttpLibrary"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryLinkChecker"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryMiscellaneous"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryMonitoring"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryScrapingFramework"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategorySearchEngine"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategorySecurity"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategorySeo"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategorySocialMedia"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "CategoryAI"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "SignalAutomatedBrowser"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "SignalKnownBotDataCenter"
          action_to_use {
            count {}
          }
        }
        rule_action_override {
          name = "SignalNonBrowserUserAgent"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWS-AWSManagedRulesBotControlRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CreatedByCloudFront-f1868bcf-3a73-4c76-b3bc-f2b32bbfa1df"
    sampled_requests_enabled   = true
  }
}
