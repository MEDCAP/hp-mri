output "cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "service_name" {
  value = aws_ecs_service.api.name
}

output "task_definition_family" {
  description = "The deploy workflow reads the current revision of this family and patches only its image."
  value       = aws_ecs_task_definition.seed.family
}

output "container_name" {
  description = "Part of the CI contract; the deploy action matches on it."
  value       = var.container_name
}

output "task_role_arn" {
  description = <<-EOT
    The identity the application runs as, and therefore the ARN that must exist
    as a MongoDB Atlas database user for MONGODB-AWS auth. A new environment is
    broken until that mapping is created by hand in the Atlas console.
  EOT
  value       = aws_iam_role.task.arn
}

output "execution_role_arn" {
  description = "Passed to iam:PassRole in the deploy role's policy."
  value       = aws_iam_role.execution.arn
}

output "alb_dns_name" {
  description = "Consumed by modules/frontend-cdn as the /api/* origin."
  value       = aws_lb.this.dns_name
}

output "alb_arn" {
  value = aws_lb.this.arn
}

output "target_group_arn" {
  value = aws_lb_target_group.api.arn
}

output "log_group_name" {
  value = aws_cloudwatch_log_group.this.name
}
