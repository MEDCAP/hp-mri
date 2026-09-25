output "user_pool_id" {
  description = "Supplied to the SPA build as VITE_COGNITO_USER_POOL_ID."
  value       = aws_cognito_user_pool.this.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.this.arn
}

output "client_id" {
  description = "Supplied to the SPA build as VITE_COGNITO_CLIENT_ID."
  value       = aws_cognito_user_pool_client.web.id
}

output "issuer_url" {
  description = <<-EOT
    The issuer the backend should validate tokens against, once it validates
    them at all. Nothing consumes this yet.
  EOT
  value       = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.this.id}"
}

data "aws_region" "current" {}
