# This configuration creates the bucket its own state lives in, so the first
# apply ran with local state and was then moved here with
#
#   terraform init -migrate-state

terraform {
  backend "s3" {
    bucket         = "medcap-tfstate-862065604168"
    key            = "bootstrap/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "medcap-tfstate-lock"
    encrypt        = true
  }
}
