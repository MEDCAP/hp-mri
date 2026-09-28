variable "role_name" {
  type = string
}

variable "oidc_provider_arn" {
  description = "The token.actions.githubusercontent.com provider. Already exists in this account."
  type        = string
}

variable "subject_claims" {
  description = <<-EOT
    Exact `sub` values allowed to assume the role, e.g.
    repo:MEDCAP/hp-mri:pull_request or repo:MEDCAP/hp-mri:environment:prod.
    Wildcards are rejected below precisely because they are the easy mistake.
  EOT
  type        = list(string)

  validation {
    condition     = alltrue([for s in var.subject_claims : !strcontains(s, "*")])
    error_message = "Subject claims must be exact. A wildcard would let any workflow in the repository assume this role."
  }
}

variable "policy_json" {
  type    = string
  default = ""
}

variable "managed_policy_arns" {
  type    = list(string)
  default = []
}

variable "max_session_duration" {
  description = "One hour. A deploy that needs longer has a different problem."
  type        = number
  default     = 3600
}
