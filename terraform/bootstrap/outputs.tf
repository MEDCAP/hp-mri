output "state_bucket" {
  description = "Backend bucket name. Paste into each envs/*/backend.tf."
  value       = aws_s3_bucket.state.id
}

output "state_lock_table" {
  description = "DynamoDB lock table name."
  value       = aws_dynamodb_table.state_lock.name
}

output "github_oidc_provider_arn" {
  description = "Consumed by global/ to build the CI role trust policies."
  value       = aws_iam_openid_connect_provider.github.arn
}
