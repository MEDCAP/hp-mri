output "bucket_name" {
  description = "Passed to the application as S3_BUCKET."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "access_policy_json" {
  description = <<-EOT
    Least-privilege document for the ECS task role, scoped to the two project
    prefixes. This is the replacement for the AmazonS3FullAccess currently
    attached to ecsTaskExecutionRole (finding F2).
  EOT
  value       = data.aws_iam_policy_document.access.json
}
