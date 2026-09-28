variable "site_bucket_name" {
  description = "medcap.ai in prod -- the bucket is named after the domain."
  type        = string
}

variable "alb_dns_name" {
  description = "Backend origin for the /api/* behaviour, from modules/backend-ecs."
  type        = string
}

variable "aliases" {
  description = "Domains served. Empty means the CloudFront default domain only, which is right for dev."
  type        = list(string)
  default     = []
}

variable "certificate_arn" {
  description = "Required whenever aliases is non-empty. Must be an us-east-1 certificate."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Empty skips DNS. The medcap.ai zone is in this account, so prod can manage its own records."
  type        = string
  default     = ""
}

variable "web_acl_arn" {
  description = <<-EOT
    The live distribution has a CloudFront-created WAF attached. Worth keeping,
    though it is worth noticing that the WAF costs more per month than the
    application's actual authentication does, which is nothing.
  EOT
  type        = string
  default     = null
}

variable "api_function_arn" {
  description = <<-EOT
    The secureApiForwarding CloudFront Function on /api/*. Set in prod only so
    the import plans clean. Leave empty everywhere else -- a Referer check is
    not access control (finding F1).
  EOT
  type        = string
  default     = ""
}

variable "cache_static_assets" {
  description = <<-EOT
    The live distribution disables caching on the static site as well as the
    API. Vite emits content-hashed filenames, so the assets could be cached
    immutably at the edge; flipping this is a real behaviour change and belongs
    in its own PR, not in an import.
  EOT
  type        = bool
  default     = false
}

variable "price_class" {
  description = "PriceClass_100 covers North America and Europe, which is where this group's users are."
  type        = string
  default     = "PriceClass_100"
}

variable "comment" {
  type    = string
  default = ""
}
