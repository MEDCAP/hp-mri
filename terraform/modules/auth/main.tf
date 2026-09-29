/**
 * Cognito user pool.
 *
 * The prod pool holds ~21 real researcher accounts, so it is imported and
 * guarded. Schema attributes are immutable in Cognito: a plan that wants to
 * change them cannot be applied, it can only be fixed in HCL. If you see one,
 * stop -- do not reach for -replace.
 *
 * The backend validates the ID tokens this pool issues (@requires_auth and
 * @optional_auth in server/app/auth.py), so the pool is the API's access
 * control, not only an identity source.
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

    dynamic "recovery_mechanism" {
      for_each = var.phone_recovery ? [1] : []
      content {
        name     = "verified_phone_number"
        priority = 2
      }
    }
  }

  # Without SES the pool sends from Cognito's shared address, capped at 50
  # emails a day.
  dynamic "email_configuration" {
    for_each = var.ses_email == null ? [] : [var.ses_email]
    content {
      email_sending_account = "DEVELOPER"
      source_arn            = email_configuration.value.source_arn
      from_email_address    = email_configuration.value.from_email_address
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

  # generate_secret is left unset: a browser SPA cannot keep a secret, the
  # default is no secret, and setting it at all forces replacement of an
  # imported client -- which would change the client id the SPA is built with.

  explicit_auth_flows = var.explicit_auth_flows
  callback_urls       = var.callback_urls
  logout_urls         = var.logout_urls

  prevent_user_existence_errors = "ENABLED"

  # Hosted-UI OAuth settings. The SPA signs in with SRP and does not use them.
  allowed_oauth_flows_user_pool_client = var.oauth != null
  allowed_oauth_flows                  = var.oauth == null ? null : var.oauth.flows
  allowed_oauth_scopes                 = var.oauth == null ? null : var.oauth.scopes
  supported_identity_providers         = var.oauth == null ? null : ["COGNITO"]

  access_token_validity  = var.token_validity.access_minutes
  id_token_validity      = var.token_validity.id_minutes
  refresh_token_validity = var.token_validity.refresh_days
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  enable_token_revocation = true
}
