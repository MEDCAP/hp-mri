/**
 * The Flask API: ALB, ECS service, roles, logs and configuration.
 *
 * Two design points worth reading before changing anything here.
 *
 * 1. Terraform owns exactly one *seed* task definition. CI registers every
 *    revision after that, so aws_ecs_service carries
 *    `ignore_changes = [task_definition, desired_count]`. Without it each
 *    deploy and each `terraform apply` undo one another. The live service is at
 *    revision 13 and the seed will differ from it; that is expected and
 *    harmless precisely because of the ignore.
 *
 * 2. The execution role and the task role are separate here. In the live
 *    account they are the same role -- ecsTaskExecutionRole -- and it carries
 *    AmazonS3FullAccess, so the application has write and delete on every
 *    bucket in the account (finding F2).
 *
 *    THE ATLAS TRAP: ecsTaskExecutionRole is also the principal MongoDB Atlas
 *    trusts for MONGODB-AWS authentication. Introducing a separate task role
 *    takes production's database access away unless the new role ARN is added
 *    as an Atlas database user *first*. Confirm the mapping in the Atlas
 *    console before applying the split.
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

locals {
  name = var.name_prefix

  # Everything the container reads from the environment. server/config.py
  # currently hardcodes all of this; the task definition is where it should come
  # from, so one image can serve both environments.
  environment = merge(
    {
      FLASK_ENV     = var.flask_env
      S3_BUCKET     = var.s3_bucket_name
      MONGO_DB_NAME = var.mongo_db_name
      CORS_ORIGINS  = join(",", var.cors_origins)
    },
    var.extra_environment,
  )
}

# --- logs -------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  name = "/ecs/${local.name}"
  # The live group has no retention at all, so logs are kept and billed forever.
  retention_in_days = var.log_retention_days
}

# --- roles ------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by the ECS agent to pull the image and write logs. Never by the app.
resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Lets the agent resolve SecureString parameters into the container.
data "aws_iam_policy_document" "execution_secrets" {
  count = length(var.secret_parameter_arns) > 0 ? 1 : 0

  statement {
    effect    = "Allow"
    actions   = ["ssm:GetParameters"]
    resources = var.secret_parameter_arns
  }

  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  count  = length(var.secret_parameter_arns) > 0 ? 1 : 0
  name   = "read-task-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets[0].json
}

# The identity the application itself runs as. This is the ARN MongoDB Atlas
# must trust -- see the header.
resource "aws_iam_role" "task" {
  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "task_s3" {
  name   = "project-bucket-access"
  role   = aws_iam_role.task.id
  policy = var.s3_access_policy_json
}

# --- load balancer ----------------------------------------------------------

resource "aws_lb" "this" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  health_check {
    path                = var.health_check_path
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Deregistration has to finish faster than a deploy waits for stability.
  deregistration_delay = 30
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# --- service ----------------------------------------------------------------

resource "aws_ecs_cluster" "this" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = var.container_insights ? "enabled" : "disabled"
  }
}

# Seed revision only. CI owns every revision after this one.
resource "aws_ecs_task_definition" "seed" {
  family                   = "${local.name}-task-def"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = "${var.ecr_repository_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = var.container_port
        protocol      = "tcp"
      }]

      environment = [
        for k, v in local.environment : { name = k, value = tostring(v) }
      ]

      # Only values a console viewer should not see belong here; today that is
      # the Mongo connection string and nothing else.
      secrets = [
        for k, arn in var.secret_environment : { name = k, valueFrom = arn }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ecs"
          "mode"                  = "non-blocking"
        }
      }
    }
  ])

  lifecycle {
    # CI rolls the image forward; Terraform should not roll it back.
    ignore_changes = [container_definitions]
  }
}

resource "aws_ecs_service" "api" {
  name            = "${local.name}-service"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.seed.arn
  desired_count   = var.desired_count

  # Production currently runs a single FARGATE_SPOT task (finding F6): one spot
  # reclamation takes the whole API down. The default below is on-demand, which
  # -- at the measured utilisation of 0.1% CPU and 233 MiB -- costs less at the
  # right size than the oversized spot task does today.
  dynamic "capacity_provider_strategy" {
    for_each = var.capacity_providers
    content {
      capacity_provider = capacity_provider_strategy.value.name
      weight            = capacity_provider_strategy.value.weight
      base              = capacity_provider_strategy.value.base
    }
  }

  network_configuration {
    subnets         = var.service_subnet_ids
    security_groups = [var.service_security_group_id]
    # There is no NAT gateway in this VPC, so the task needs a public IP to
    # reach ECR, S3 and Atlas. Inbound is still ALB-only via the security group.
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  health_check_grace_period_seconds = var.health_check_grace_period

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https]

  lifecycle {
    # The most important line in this configuration. CI registers new task
    # definitions and may scale the service; Terraform must not fight it.
    ignore_changes = [task_definition, desired_count]
  }
}
