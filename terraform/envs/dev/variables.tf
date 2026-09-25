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
  type = list(string)
  default = [
    "subnet-08d0a5035dd99648e",
    "subnet-05ea932d2eafe0a1b",
  ]
}

variable "data_bucket_name" {
  description = "New bucket. Seed it with two or three small .mrd files rather than copying prod."
  type        = string
  default     = "medcap-data-dev"
}

variable "site_bucket_name" {
  description = "Named after the domain, matching the prod convention."
  type        = string
  default     = "medcap-dev.medcap.ai"
}

variable "aliases" {
  type    = list(string)
  default = ["medcap-dev.medcap.ai"]
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

variable "seed_image_tag" {
  type    = string
  default = "7caa165f25e1e8e581839d486d9895934170a03d"
}

variable "mongo_uri" {
  description = "Supplied out of band. Same Atlas cluster as prod, different database."
  type        = string
  sensitive   = true
}
