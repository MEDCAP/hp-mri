/**
 * Cognito user pool.
 *
 * The prod pool holds ~21 real researcher accounts, so it is imported and
 * guarded. Schema attributes are immutable in Cognito: a plan that wants to
 * change them cannot be applied, it can only be fixed in HCL. If you see one,
 * stop -- do not reach for -replace.
 *
 * Note what this module does NOT do: the backend never validates the tokens
 * this pool issues. Cognito is client-side only today, so the pool is an
 * identity source and not, yet, an access control.
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

resource "aws_cognito_user_pool" "this" {
  name = var.pool_name

  deletion_protection = var.deletion_protection ? "ACTIVE" : "INACTIVE"
  mfa_configuration   = var.mfa_configuration

  password_policy {
    minimum_length                   = var.password_policy.minimum_length
    require_uppercase                = var.password_policy.require_uppercase
    require_lowercase                = var.password_policy.require_lowercase
    require_numbers                  = var.password_policy.require_numbers
    require_symbols                  = var.password_policy.require_symbols
    temporary_password_validity_days = var.password_policy.temporary_password_validity_days
  }

  username_attributes      = var.username_attributes
  auto_verified_attributes = var.auto_verified_attributes

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  lifecycle {
    prevent_destroy = true
    # Cognito rejects schema changes outright; keeping them out of the diff
    # stops a plan from proposing something that can never apply.
    ignore_changes = [schema]
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = var.client_name
  user_pool_id = aws_cognito_user_pool.this.id

  # A browser SPA cannot keep a secret.
  generate_secret = false

  explicit_auth_flows = var.explicit_auth_flows
  callback_urls       = var.callback_urls
  logout_urls         = var.logout_urls

  prevent_user_existence_errors = "ENABLED"
}
