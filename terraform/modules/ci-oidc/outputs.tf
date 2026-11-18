output "role_arn" {
  description = "Passed to aws-actions/configure-aws-credentials as role-to-assume."
  value       = aws_iam_role.this.arn
}

output "role_name" {
  value = aws_iam_role.this.name
}
