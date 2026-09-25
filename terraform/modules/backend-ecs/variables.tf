variable "name_prefix" {
  description = "Prefix for every resource here, e.g. hpmri-prod."
  type        = string
}

variable "region" {
  type    = string
  default = "us-east-1"
}

# --- network ----------------------------------------------------------------

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  description = "Subnets the ALB lives in. Needs at least two AZs."
  type        = list(string)
}

variable "service_subnet_ids" {
  description = "Subnets the tasks run in."
  type        = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "service_security_group_id" {
  type = string
}

variable "assign_public_ip" {
  description = "True while the VPC has no NAT gateway; the task needs egress to ECR, S3 and Atlas."
  type        = bool
  default     = true
}

# --- container --------------------------------------------------------------

variable "ecr_repository_url" {
  type = string
}

variable "image_tag" {
  description = "Seed image only. CI supplies every tag after this one."
  type        = string
}

variable "container_name" {
  description = <<-EOT
    The deploy workflow patches the image field of the container with this name,
    so the string is part of the CI contract -- change it here and in
    .github/workflows/deploy-backend.yml together, or deploys silently stop
    updating the image.

    The pre-migration task definition called it `medcap-app`.
  EOT
  type        = string
  default     = "hpmri-api"
}

variable "container_port" {
  type    = number
  default = 5000
}

variable "cpu" {
  description = <<-EOT
    Live production is 4096/8192 while using 0.1% CPU and 233 MiB (measured over
    14 days). 1024 leaves roughly 1.7x headroom over the observed peak of ~0.6
    vCPU, which was mostly startup.
  EOT
  type        = number
  default     = 1024
}

variable "memory" {
  type    = number
  default = 2048
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "capacity_providers" {
  description = <<-EOT
    On-demand by default. Spot is a false economy here: right-sized on-demand
    costs less than the current oversized spot task and removes the single
    point of failure described in finding F6.
  EOT
  type = list(object({
    name   = string
    weight = number
    base   = number
  }))
  default = [{ name = "FARGATE", weight = 1, base = 1 }]
}

# --- application configuration ----------------------------------------------

variable "flask_env" {
  description = "Set per environment. The Dockerfile must stop baking this in (finding CFG-4)."
  type        = string
  default     = "production"
}

variable "s3_bucket_name" {
  type = string
}

variable "s3_access_policy_json" {
  description = "From modules/data. Replaces AmazonS3FullAccess on the task role."
  type        = string
}

variable "mongo_db_name" {
  description = "hpmri_prod / hpmri_dev. Production ran against one literally named medcap_dev until the rename."
  type        = string
}

variable "cors_origins" {
  description = <<-EOT
    Joined with commas for the container. Near-vestigial while CloudFront makes
    the SPA and API same-origin, but ProductionConfig sets none at all today, so
    the API would be unusable the moment it moved to its own hostname.
  EOT
  type        = list(string)
  default     = []
}

variable "extra_environment" {
  type    = map(string)
  default = {}
}

variable "secret_environment" {
  description = <<-EOT
    name -> SSM parameter ARN, injected as container `secrets`. Only values a
    console viewer should not see: today that is MONGO_URI alone.
  EOT
  type        = map(string)
  default     = {}
}

variable "secret_parameter_arns" {
  description = "ARNs the execution role may read. Usually values(secret_environment)."
  type        = list(string)
  default     = []
}

# --- edges ------------------------------------------------------------------

variable "certificate_arn" {
  type = string
}

variable "ssl_policy" {
  type    = string
  default = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "health_check_path" {
  type    = string
  default = "/api/health"
}

variable "health_check_grace_period" {
  description = <<-EOT
    Generous because the magnet modules call S3 at import time, so startup does
    network I/O before the app can serve anything (see INVENTORY.md). Reduce it
    once that is fixed.
  EOT
  type        = number
  default     = 100
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "container_insights" {
  description = "Off by default; it bills per metric and this service has one task."
  type        = bool
  default     = false
}

variable "enable_deletion_protection" {
  type    = bool
  default = true
}
