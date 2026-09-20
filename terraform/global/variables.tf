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
