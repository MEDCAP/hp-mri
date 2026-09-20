/**
 * Account-wide pieces: the GitHub Actions roles and the shared image registry.
 *
 * Kept out of envs/ because these are not per-environment, and because the
 * plan role must exist before any environment's plan job can run.
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
      Component = "global"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id   = data.aws_caller_identity.current.account_id
  repo         = "repo:${var.github_org}/${var.github_repo}"
  state_bucket = "medcap-tfstate-${local.account_id}"
  oidc_arn     = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

# One repository, tag-namespaced per environment, rather than two. Cheaper and
# there is nothing secret in a dev image that is not in a prod one.
import {
  to = aws_ecr_repository.app
  id = "medcap-app"
}

resource "aws_ecr_repository" "app" {
  name = "medcap-app"

  # FOLLOW-UP: the live repository is MUTABLE. Immutable tags are the right end
  # state -- they make a rollback to an older tag mean exactly what it says --
  # but flipping it is a change, so it plans clean as MUTABLE first.
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep the 30 most recent images; older ones are only ever rollback targets."
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 30
        }
        action = { type = "expire" }
      },
    ]
  })
}

# --- state access, shared by every CI role ----------------------------------

data "aws_iam_policy_document" "state_access" {
  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${local.state_bucket}"]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${local.state_bucket}/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
    resources = ["arn:aws:dynamodb:${var.region}:${local.account_id}:table/medcap-tfstate-lock"]
  }
}

/**
 * Plan role: read-only plus state.
 *
 * Scoped to pull_request, which is the only claim available to a PR workflow.
 * Because it cannot write anything, a leaked token from a plan job is a
 * disclosure problem rather than a control problem -- which is exactly why
 * plan and apply are separate roles.
 */
module "terraform_plan" {
  source = "../modules/ci-oidc"

  role_name         = "gha-terraform-plan"
  oidc_provider_arn = local.oidc_arn
  subject_claims    = ["${local.repo}:pull_request"]

  managed_policy_arns = ["arn:aws:iam::aws:policy/ReadOnlyAccess"]
  policy_json         = data.aws_iam_policy_document.state_access.json
}

/**
 * Apply roles, one per environment.
 *
 * These key on `environment:` rather than `ref:` so the IAM condition and the
 * GitHub Environment reviewer gate are the same control. PowerUserAccess plus
 * a narrow IAM grant is deliberate: Terraform here creates roles and policies,
 * which PowerUser alone cannot do, but full administrator is more than any
 * pipeline needs.
 */
data "aws_iam_policy_document" "apply_iam" {
  statement {
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:PassRole",
      "iam:UpdateAssumeRolePolicy",
    ]
    resources = ["arn:aws:iam::${local.account_id}:role/hpmri-*"]
  }
}

data "aws_iam_policy_document" "apply_prod_guardrails" {
  # Terraform should never be the thing that destroys these, whatever a plan
  # says. prevent_destroy covers honest mistakes; this covers the rest.
  statement {
    effect  = "Deny"
    actions = ["s3:DeleteBucket"]
    resources = [
      "arn:aws:s3:::medcap-data",
      "arn:aws:s3:::medcap.ai",
      "arn:aws:s3:::${local.state_bucket}",
    ]
  }

  statement {
    effect    = "Deny"
    actions   = ["cognito-idp:DeleteUserPool"]
    resources = ["*"]
  }
}

module "terraform_apply_dev" {
  source = "../modules/ci-oidc"

  role_name         = "gha-terraform-apply-dev"
  oidc_provider_arn = local.oidc_arn
  subject_claims    = ["${local.repo}:environment:dev"]

  managed_policy_arns = ["arn:aws:iam::aws:policy/PowerUserAccess"]
  policy_json         = data.aws_iam_policy_document.combined_apply_dev.json
}

data "aws_iam_policy_document" "combined_apply_dev" {
  source_policy_documents = [
    data.aws_iam_policy_document.state_access.json,
    data.aws_iam_policy_document.apply_iam.json,
  ]
}

data "aws_iam_policy_document" "combined_apply_prod" {
  source_policy_documents = [
    data.aws_iam_policy_document.state_access.json,
    data.aws_iam_policy_document.apply_iam.json,
    data.aws_iam_policy_document.apply_prod_guardrails.json,
  ]
}

module "terraform_apply_prod" {
  source = "../modules/ci-oidc"

  role_name         = "gha-terraform-apply-prod"
  oidc_provider_arn = local.oidc_arn
  subject_claims    = ["${local.repo}:environment:prod"]

  managed_policy_arns = ["arn:aws:iam::aws:policy/PowerUserAccess"]
  policy_json         = data.aws_iam_policy_document.combined_apply_prod.json
}

/**
 * Deploy roles.
 *
 * Narrow on purpose: push an image, register a task definition, roll the
 * service, sync the site bucket, invalidate the distribution. Nothing else.
 * iam:PassRole is the dangerous one, so it names the two roles explicitly
 * rather than taking a wildcard.
 */
data "aws_iam_policy_document" "deploy" {
  for_each = toset(["dev", "prod"])

  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPush"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:DescribeImages",
    ]
    resources = [aws_ecr_repository.app.arn]
  }

  statement {
    sid    = "RollTheService"
    effect = "Allow"
    actions = [
      "ecs:DescribeServices",
      "ecs:DescribeTaskDefinition",
      "ecs:DescribeTasks",
      "ecs:ListTasks",
      "ecs:RegisterTaskDefinition",
      "ecs:UpdateService",
    ]
    resources = ["*"]
  }

  statement {
    sid     = "PassOnlyThisEnvironmentsTaskRoles"
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = [
      "arn:aws:iam::${local.account_id}:role/hpmri-${each.key}-task",
      "arn:aws:iam::${local.account_id}:role/hpmri-${each.key}-execution",
    ]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid     = "PublishTheSpa"
    effect  = "Allow"
    actions = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"]
    resources = [
      "arn:aws:s3:::${var.site_buckets[each.key]}",
      "arn:aws:s3:::${var.site_buckets[each.key]}/*",
    ]
  }

  statement {
    sid       = "InvalidateTheEdge"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["*"]
  }
}

module "deploy" {
  source   = "../modules/ci-oidc"
  for_each = toset(["dev", "prod"])

  role_name         = "gha-deploy-${each.key}"
  oidc_provider_arn = local.oidc_arn
  subject_claims    = ["${local.repo}:environment:${each.key}"]
  policy_json       = data.aws_iam_policy_document.deploy[each.key].json
}
