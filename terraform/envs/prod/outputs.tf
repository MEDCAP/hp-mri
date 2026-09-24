/**
 * These feed the GitHub Environment variables the deploy workflows read, so
 * after an apply:
 *
 *   terraform output -json | jq
 *
 * and set SITE_BUCKET, CF_DISTRIBUTION_ID, VITE_COGNITO_* and PUBLIC_BASE_URL
 * on the `prod` environment accordingly.
 */
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

output "container_name" {
  value = module.backend.container_name
}

output "task_role_arn" {
  description = "Must exist as a MongoDB Atlas database user, or the app cannot authenticate."
  value       = module.backend.task_role_arn
}

output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_client_id" {
  value = module.auth.client_id
}
