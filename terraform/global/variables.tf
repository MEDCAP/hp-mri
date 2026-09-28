variable "region" {
  type    = string
  default = "us-east-1"
}

variable "github_org" {
  type    = string
  default = "MEDCAP"
}

variable "github_repo" {
  type    = string
  default = "hp-mri"
}

variable "site_buckets" {
  description = <<-EOT
    Environment -> static site bucket, so each deploy role can be scoped to the
    one bucket it publishes. The dev bucket does not exist yet; the role is
    still created with the name it will have.
  EOT
  type        = map(string)
  default = {
    prod = "medcap.ai"
    dev  = "medcap-dev.medcap.ai"
  }
}

variable "ecr_lifecycle_policy_enabled" {
  description = <<-EOT
    Create the keep-30-images lifecycle policy on the imported medcap-app
    repository. Off by default so the import changes nothing live; enabling it
    expires older images, including rollback targets.
  EOT
  type        = bool
  default     = false
}
