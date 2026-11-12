output "terraform_plan_role_arn" {
  value = module.terraform_plan.role_arn
}

output "terraform_apply_role_arns" {
  value = {
    dev  = module.terraform_apply_dev.role_arn
    prod = module.terraform_apply_prod.role_arn
  }
}

output "deploy_role_arns" {
  value = { for k, m in module.deploy : k => m.role_arn }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "dev_tyger_parameter_arns" {
  description = "Read by envs/dev's task execution role."
  value       = { for k, p in aws_ssm_parameter.dev_tyger : k => p.arn }
}
