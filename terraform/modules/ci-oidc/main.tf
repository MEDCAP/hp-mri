/**
 * One GitHub Actions role.
 *
 * The trust policy pins both the audience and an exact list of `sub` claims.
 * Never widen these to repo:MEDCAP/hp-mri:* -- that would let any workflow on
 * any branch of the repo, including one added by a fork's pull request, assume
 * the role.
 *
 * Write-capable roles key on `environment:` claims rather than `ref:`, so the
 * IAM condition and the GitHub Environment reviewer gate are the same control
 * rather than two that can drift apart.
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

data "aws_iam_policy_document" "assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # A list here is an OR across exact values, not a wildcard.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = var.subject_claims
    }
  }
}

resource "aws_iam_role" "this" {
  name                 = var.role_name
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  max_session_duration = var.max_session_duration
}

resource "aws_iam_role_policy" "inline" {
  count  = var.policy_json != "" ? 1 : 0
  name   = "${var.role_name}-inline"
  role   = aws_iam_role.this.id
  policy = var.policy_json
}

resource "aws_iam_role_policy_attachment" "managed" {
  for_each   = toset(var.managed_policy_arns)
  role       = aws_iam_role.this.name
  policy_arn = each.value
}
