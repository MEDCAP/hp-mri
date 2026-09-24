variable "bucket_name" {
  description = "Bucket name. medcap-data in prod (imported); a new bucket in dev."
  type        = string
}

variable "cors_allowed_origins" {
  description = <<-EOT
    Origins allowed to send the presigned PUT. Must include the site origin and,
    for local development against real S3, http://localhost:5173.
  EOT
  type        = list(string)
}

variable "files_prefix" {
  description = "Where finalised MRD files live. Matches data.py's mrd_files/{id} key."
  type        = string
  default     = "mrd_files/"
}

variable "staging_prefix" {
  description = "Presigned upload landing zone. Must match config.UPLOAD_STAGING_PREFIX."
  type        = string
  default     = "uploads/staging/"
}

variable "staging_expiry_days" {
  description = "How long an abandoned staged upload survives."
  type        = number
  default     = 1
}

variable "versioning_enabled" {
  description = <<-EOT
    Import prod with this false so the first plan is clean, then flip it in a
    follow-up PR. Enabling it is a real change and deserves its own reviewable
    diff.
  EOT
  type        = bool
  default     = true
}

variable "noncurrent_version_expiry_days" {
  description = "How long superseded object versions are retained once versioning is on."
  type        = number
  default     = 365
}

variable "force_destroy" {
  description = "Must stay false for prod. Only ever true for a throwaway dev bucket."
  type        = bool
  default     = false
}
