/**
 * Adoption of the long-lived production resources.
 *
 * Only things that are expensive or impossible to recreate are imported, and
 * each group must plan
 *
 *     0 to add, 0 to change, 0 to destroy
 *
 * before it merges. Any destroy or replace under an import PR is a blocker.
 * Resource ids come from docs/INVENTORY.md.
 *
 * The compute layer is deliberately NOT here. The live cluster, service, ALB,
 * target group, security groups and log group all carry names from an earlier
 * era (mrissim-test1, medcap-app-service-v3), and importing them under sane
 * names would force a replace -- downtime -- for no benefit over simply
 * building the new stack beside the old and moving traffic at CloudFront. See
 * the header of main.tf and the cutover sequence in ../../README.md.
 *
 * Also not imported:
 *
 *   medcap-app-task-def:13   Terraform owns a seed revision; CI registers the
 *                            rest, and the service ignores task_definition.
 *   E1LTBXHERJ8IYX           Second distribution, enabled, pointing at an ALB
 *                            that no longer exists (finding F7). Delete it
 *                            rather than adopt it.
 *   ecsTaskExecutionRole     Both execution and task role, carrying
 *                            AmazonS3FullAccess (finding F2). The module
 *                            builds a properly separated pair instead. Add the
 *                            new task role ARN to Atlas BEFORE cutting over --
 *                            see README.md.
 *   The WAF WebACL           CloudFront-managed; referenced, not owned.
 *   The ACM certificate      DNS-validated and stable; read as a data source.
 */

# --- group 1: the data bucket -----------------------------------------------

import {
  to = module.data.aws_s3_bucket.this
  id = "medcap-data"
}

import {
  to = module.data.aws_s3_bucket_versioning.this
  id = "medcap-data"
}

import {
  to = module.data.aws_s3_bucket_public_access_block.this
  id = "medcap-data"
}

import {
  to = module.data.aws_s3_bucket_server_side_encryption_configuration.this
  id = "medcap-data"
}

# No import blocks for the CORS or lifecycle configurations: neither exists on
# the live bucket (findings F4 and F5), so those are genuine creates. Expect
# this group's plan to show exactly two additions and nothing else. The CORS
# rule is what unblocks the presigned upload flow.

# --- group 2: the user pool -------------------------------------------------

import {
  to = module.auth.aws_cognito_user_pool.this
  id = "us-east-1_vUo50ofKI"
}

import {
  to = module.auth.aws_cognito_user_pool_client.web
  id = "us-east-1_vUo50ofKI/4nvgf7et9f4ui0glr4ddf152r8"
}

# --- group 3: the site bucket and the distribution --------------------------

import {
  to = module.frontend.aws_s3_bucket.site
  id = "medcap.ai"
}

import {
  to = module.frontend.aws_s3_bucket_website_configuration.site
  id = "medcap.ai"
}

import {
  to = module.frontend.aws_s3_bucket_policy.site
  id = "medcap.ai"
}

import {
  to = module.frontend.aws_s3_bucket_public_access_block.site
  id = "medcap.ai"
}

import {
  to = module.frontend.aws_cloudfront_distribution.this
  id = "EXE6YNQ2JA1MA"
}

import {
  to = module.frontend.aws_route53_record.alias[0]
  id = "Z07746902LXWEEA7WNLDV_medcap.ai_A"
}
