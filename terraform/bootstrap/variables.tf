variable "region" {
  description = "AWS region. Everything for this project lives in us-east-1, which is also where CloudFront requires its certificates."
  type        = string
  default     = "us-east-1"
}
