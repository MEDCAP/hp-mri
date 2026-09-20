/**
 * Adoption of the live, hand-built infrastructure.
 *
 * Work through these in groups, one PR per group, in the order below. A group
 * is done when `terraform plan` reads
 *
 *     0 to add, 0 to change, 0 to destroy
 *
 * Any plan under an import PR that shows a destroy or a replace is a blocker,
 * not something to push past. Resource ids come from docs/INVENTORY.md.
 *
 * To generate a starting point for a resource's HCL:
 *
 *     terraform plan -generate-config-out=/tmp/gen.tf
 *
 * then move the meaningful attributes into the module by hand. Never commit the
 * generated file: it emits every default and no variables.
 *
 * Deliberately absent, with reasons:
 *
 *   medcap-app-task-def:13   Terraform owns a seed revision only; CI registers
 *                            the rest, and the service ignores task_definition.
 *   E1LTBXHERJ8IYX           Second distribution, enabled, pointing at an ALB
 *                            that no longer exists (finding F7). Resolve what
 *                            it is for before adopting it.
 *   ecsTaskExecutionRole     Not adopted as-is. It is both execution and task
 *                            role and carries AmazonS3FullAccess (finding F2);
 *                            the module creates a proper pair instead. Confirm
 *                            the MongoDB Atlas database-user mapping BEFORE
 *                            switching, or production loses database access.
 *   The WAF WebACL           CloudFront-managed; referenced, not owned.
 *   The ACM certificate      DNS-validated and stable; read as a data source.
 */

# --- group 1: data ----------------------------------------------------------

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
# the live bucket (findings F4 and F5), so these are genuine creates. Expect
# this group's plan to show exactly two additions, and nothing else.

# --- group 2: auth ----------------------------------------------------------

import {
  to = module.auth.aws_cognito_user_pool.this
  id = "us-east-1_vUo50ofKI"
}

import {
  to = module.auth.aws_cognito_user_pool_client.web
  id = "us-east-1_vUo50ofKI/4nvgf7et9f4ui0glr4ddf152r8"
}

# --- group 3: network and backend -------------------------------------------
#
# The security groups are imported because their rules are already correct: 443
# on the ALB comes only from CloudFront's prefix list, and the tasks accept
# traffic only from the ALB.

import {
  to = module.network.aws_security_group.alb
  id = "sg-002ff50931724c392"
}

import {
  to = module.network.aws_security_group.service
  id = "sg-0c52dc46530916103"
}

import {
  to = module.backend.aws_cloudwatch_log_group.this
  id = "/ecs/medcap-app"
}

import {
  to = module.backend.aws_lb.this
  id = "arn:aws:elasticloadbalancing:us-east-1:862065604168:loadbalancer/app/medcap-app-public-alb/90bf6b0cc7f07331"
}

import {
  to = module.backend.aws_lb_target_group.api
  id = "arn:aws:elasticloadbalancing:us-east-1:862065604168:targetgroup/medcap-app-public-alb-tg/54ad780f7b9939fa"
}

import {
  to = module.backend.aws_ecs_cluster.this
  id = "mrissim-test1"
}

import {
  to = module.backend.aws_ecs_service.api
  id = "mrissim-test1/medcap-app-service-v3"
}

# Listener ARNs are not stable across recreations, so they are read at import
# time rather than hardcoded here:
#
#   aws elbv2 describe-listeners \
#     --load-balancer-arn <alb-arn> \
#     --query 'Listeners[].{Port:Port,Arn:ListenerArn}'
#
# import {
#   to = module.backend.aws_lb_listener.https
#   id = "<443 listener arn>"
# }
#
# import {
#   to = module.backend.aws_lb_listener.http
#   id = "<80 listener arn>"
# }

# NOTE: the live cluster is `mrissim-test1` and the service is
# `medcap-app-service-v3`, while the module would name them hpmri-prod and
# hpmri-prod-service. Importing under the module's names would force a replace
# -- which for a cluster and service means downtime. Either set name_prefix to
# match the existing names, or accept a one-time migration behind a maintenance
# window. This is the one place where adoption cannot be perfectly silent, and
# it needs a decision before group 3 is attempted.

# --- group 4: frontend ------------------------------------------------------

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
