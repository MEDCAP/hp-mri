output "site_bucket" {
  value = module.frontend.site_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.frontend.distribution_id
}

output "public_base_url" {
  value = module.frontend.web_origin
}

output "ecs_cluster" {
  value = module.backend.cluster_name
}

output "ecs_service" {
  value = module.backend.service_name
}

output "task_definition_family" {
  value = module.backend.task_definition_family
}

output "task_role_arn" {
  description = <<-EOT
    Add this to MongoDB Atlas as a database user with MONGODB-AWS auth before
    expecting anything to work. Without it the API returns 503 on every request
    that touches the database.
  EOT
  value       = module.backend.task_role_arn
}

output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_client_id" {
  value = module.auth.client_id
}
