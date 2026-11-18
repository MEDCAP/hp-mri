variable "name_prefix" {
  type = string
}

variable "create_vpc" {
  description = <<-EOT
    False by default: the live VPC predates Terraform and is shared with the
    rest of the Penn account, so it is read rather than owned. Creating one is a
    decision for a new environment, not a side effect of adoption.
  EOT
  type        = bool
  default     = false
}

variable "vpc_id" {
  description = "Required when create_vpc is false. vpc-0a77a847a26f00121 in prod."
  type        = string
  default     = ""
}

variable "subnet_ids" {
  description = "Explicit subnets. Empty means every subnet in the VPC."
  type        = list(string)
  default     = []
}

variable "container_port" {
  type    = number
  default = 5000
}
