/**
 * VPC plumbing and the two security groups.
 *
 * The live VPC (vpc-0a77a847a26f00121, 10.128.185.128/25) was created outside
 * Terraform and is shared with whatever else lives in this Penn account, so the
 * default is to *read* it rather than own it. Set create_vpc = true only for an
 * environment that should have its own.
 *
 * The existing security-group rules are already correct and are reproduced
 * faithfully: 443 on the ALB comes only from CloudFront's origin-facing prefix
 * list, and the tasks accept traffic only from the ALB. That is the part of the
 * hand-built setup least in need of changing.
 */
terraform {
  required_version = "~> 1.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

data "aws_vpc" "existing" {
  count = var.create_vpc ? 0 : 1
  id    = var.vpc_id
}

data "aws_subnets" "existing" {
  count = var.create_vpc ? 0 : 1
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

locals {
  vpc_id = var.create_vpc ? null : data.aws_vpc.existing[0].id

  # Explicit ids win; otherwise take everything in the VPC.
  subnet_ids = length(var.subnet_ids) > 0 ? var.subnet_ids : data.aws_subnets.existing[0].ids
}

# CloudFront's managed prefix list. Restricting 443 to it means the ALB cannot
# be reached directly, only through the distribution -- which is what makes the
# edge function and WAF meaningful rather than trivially skippable.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb"
  description = "Public ALB for the HP-MRI API"
  vpc_id      = local.vpc_id

  tags = { Name = "${var.name_prefix}-alb" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_https_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from CloudFront edge locations only"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

resource "aws_vpc_security_group_ingress_rule" "alb_http_redirect" {
  security_group_id = aws_security_group.alb.id
  description       = "Port 80 exists only to 301 to 443"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_tasks" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to the service"
  ip_protocol                  = "tcp"
  from_port                    = var.container_port
  to_port                      = var.container_port
  referenced_security_group_id = aws_security_group.service.id
}

resource "aws_security_group" "service" {
  name        = "${var.name_prefix}-service"
  description = "HP-MRI API tasks"
  vpc_id      = local.vpc_id

  tags = { Name = "${var.name_prefix}-service" }
}

resource "aws_vpc_security_group_ingress_rule" "service_from_alb" {
  security_group_id            = aws_security_group.service.id
  description                  = "Only the ALB may reach the container"
  ip_protocol                  = "tcp"
  from_port                    = var.container_port
  to_port                      = var.container_port
  referenced_security_group_id = aws_security_group.alb.id
}

# Egress is open because the task reaches ECR, S3, CloudWatch and MongoDB Atlas,
# and Atlas is a third-party endpoint with no stable prefix list to pin to.
resource "aws_vpc_security_group_egress_rule" "service_all" {
  security_group_id = aws_security_group.service.id
  description       = "ECR, S3, CloudWatch, MongoDB Atlas"
  ip_protocol       = "-1"
  cidr_ipv4         = "0.0.0.0/0"
}
