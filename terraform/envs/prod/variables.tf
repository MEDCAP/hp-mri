variable "region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_id" {
  type    = string
  default = "vpc-0a77a847a26f00121"
}

variable "subnet_ids" {
  description = "All four subnets; the ALB spans both AZs."
  type        = list(string)
  default = [
    "subnet-0d5062cc077c10efe", # us-east-1a
    "subnet-0a92b66b82a1bba41", # us-east-1b
    "subnet-08d0a5035dd99648e", # us-east-1a
    "subnet-05ea932d2eafe0a1b", # us-east-1b
  ]
}

variable "service_subnet_ids" {
  description = "The two the live service actually runs in."
  type        = list(string)
  default = [
    "subnet-0d5062cc077c10efe",
    "subnet-0a92b66b82a1bba41",
  ]
}

variable "ecr_repository_url" {
  type    = string
  default = "862065604168.dkr.ecr.us-east-1.amazonaws.com/medcap-app"
}

variable "seed_image_tag" {
  description = <<-EOT
    Seed revision only; the service ignores task_definition thereafter. The live
    revision is tagged by git SHA rather than by VERSION, which is worth
    reconciling with the release policy.
  EOT
  type        = string
  default     = "7caa165f25e1e8e581839d486d9895934170a03d"
}

variable "certificate_arn" {
  description = "Covers medcap.ai and *.medcap.ai."
  type        = string
  default     = "arn:aws:acm:us-east-1:862065604168:certificate/8e00f2be-9b29-4be3-9839-41587b8a90fe"
}

variable "route53_zone_id" {
  description = "The medcap.ai public zone, which is in this account."
  type        = string
  default     = "Z07746902LXWEEA7WNLDV"
}

variable "web_acl_arn" {
  type    = string
  default = "arn:aws:wafv2:us-east-1:862065604168:global/webacl/CreatedByCloudFront-f1868bcf-3a73-4c76-b3bc-f2b32bbfa1df/e5de59c1-72c5-459a-b51e-84be500a64ac"
}

variable "api_function_arn" {
  description = "secureApiForwarding. Referenced so the import is clean; not a security control."
  type        = string
  default     = "arn:aws:cloudfront::862065604168:function/secureApiForwarding"
}

variable "mongo_uri" {
  description = <<-EOT
    Supplied out of band -- never in a committed tfvars file. The parameter
    ignores changes to its value after creation, so rotating it in the console
    is safe.
  EOT
  type        = string
  sensitive   = true
}

variable "api_origin_dns_name" {
  description = <<-EOT
    The ALB CloudFront sends /api/* to.

    Set to the OLD load balancer during the migration, so the new stack can be
    built and exercised without moving production traffic. Set it to "" to cut
    over to the ALB this configuration creates; that empty string is the
    deploy, and putting the old value back is the rollback.

    Delete the variable once the old ALB is gone.
  EOT
  type        = string
  default     = "medcap-app-public-alb-1585919488.us-east-1.elb.amazonaws.com"
}
