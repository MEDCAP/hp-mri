variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_id" {
  type    = string
  default = "vpc-0a77a847a26f00121"
}

variable "subnet_ids" {
  type = list(string)
  default = [
    "subnet-0d5062cc077c10efe",
    "subnet-0a92b66b82a1bba41",
    "subnet-08d0a5035dd99648e",
    "subnet-05ea932d2eafe0a1b",
  ]
}

variable "service_subnet_ids" {
  description = <<-EOT
    The ALB and the task share these: one per AZ (an ALB takes no more), and the
    only two routed to the internet gateway. The VPC has no NAT, so a task in
    08d0/05ea could not reach ECR or Atlas.
  EOT
  type        = list(string)
  default = [
    "subnet-0d5062cc077c10efe", # us-east-1a
    "subnet-0a92b66b82a1bba41", # us-east-1b
  ]
}

variable "certificate_arn" {
  description = "The prod certificate already covers *.medcap.ai, so dev needs no new one."
  type        = string
  default     = "arn:aws:acm:us-east-1:862065604168:certificate/8e00f2be-9b29-4be3-9839-41587b8a90fe"
}

variable "route53_zone_id" {
  type    = string
  default = "Z07746902LXWEEA7WNLDV"
}

variable "ecr_repository_url" {
  description = "Shared with prod; tags are namespaced dev-* and prod-*."
  type        = string
  default     = "862065604168.dkr.ecr.us-east-1.amazonaws.com/medcap-app"
}

variable "image_tag" {
  description = "Seed image. CI (deploy-backend.yml, environment=dev) or dev-ecs.sh up --image supplies later ones."
  type        = string
  default     = "7caa165f25e1e8e581839d486d9895934170a03d"
}

variable "hostname" {
  description = "Under the *.medcap.ai certificate, so HTTPS works with no new certificate."
  type        = string
  default     = "api-dev.medcap.ai"
}

variable "allowed_cidrs" {
  description = "Who may reach the ALB, e.g. [\"203.0.113.7/32\"]. dev-ecs.sh up fills in the caller's IP."
  type        = list(string)
}

variable "tyger_server_url" {
  type    = string
  default = "https://spinhance.tyger.cloud"
}
