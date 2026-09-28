variable "pool_name" {
  description = "The live prod pool is named 'User pool - lwrhys' -- an auto-generated name that must be reproduced exactly on import."
  type        = string
}

variable "client_name" {
  type = string
}

variable "deletion_protection" {
  type    = bool
  default = true
}

variable "mfa_configuration" {
  description = "OFF in prod today. Turning it on is a user-facing change, not an adoption."
  type        = string
  default     = "OFF"
}

variable "password_policy" {
  type = object({
    minimum_length                   = number
    require_uppercase                = bool
    require_lowercase                = bool
    require_numbers                  = bool
    require_symbols                  = bool
    temporary_password_validity_days = number
  })
  # Matches the live pool exactly, so the import plans clean.
  default = {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 7
  }
}

variable "username_attributes" {
  type    = list(string)
  default = ["email"]
}

variable "auto_verified_attributes" {
  type    = list(string)
  default = ["email"]
}

variable "explicit_auth_flows" {
  type = list(string)
  default = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]
}

variable "callback_urls" {
  type    = list(string)
  default = []
}

variable "logout_urls" {
  type    = list(string)
  default = []
}
