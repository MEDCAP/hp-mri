output "api_url" {
  value = "https://${var.hostname}"
}

output "ecs_cluster" {
  value = module.backend.cluster_name
}

output "ecs_service" {
  value = module.backend.service_name
}

output "log_group_name" {
  value = module.backend.log_group_name
}

output "task_role_arn" {
  description = "Must exist in MongoDB Atlas (MONGODB-AWS, readWrite on hpmri_prod), or every database request returns 503."
  value       = module.backend.task_role_arn
}
