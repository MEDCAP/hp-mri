output "vpc_id" {
  value = local.vpc_id
}

output "subnet_ids" {
  value = local.subnet_ids
}

output "alb_security_group_id" {
  value = aws_security_group.alb.id
}

output "service_security_group_id" {
  value = aws_security_group.service.id
}
