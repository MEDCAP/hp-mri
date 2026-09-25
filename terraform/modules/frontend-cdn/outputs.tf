output "distribution_id" {
  description = "The deploy workflow invalidates against this."
  value       = aws_cloudfront_distribution.this.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "site_bucket_name" {
  description = "The deploy workflow syncs dist/ here."
  value       = aws_s3_bucket.site.id
}

output "site_bucket_arn" {
  value = aws_s3_bucket.site.arn
}

output "web_origin" {
  description = <<-EOT
    The origin browsers actually load, which is what the data bucket's CORS
    rules and the API's CORS_ORIGINS must both allow.
  EOT
  value       = length(var.aliases) > 0 ? "https://${var.aliases[0]}" : "https://${aws_cloudfront_distribution.this.domain_name}"
}
