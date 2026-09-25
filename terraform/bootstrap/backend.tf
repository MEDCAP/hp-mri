# Uncomment after the first local apply, then run
#
#   terraform init -migrate-state
#
# and delete the local terraform.tfstate it leaves behind. This configuration
# creates the bucket its own state moves into, which is why the two steps cannot
# be one.
#
# terraform {
#   backend "s3" {
#     bucket         = "medcap-tfstate-862065604168"
#     key            = "bootstrap/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "medcap-tfstate-lock"
#     encrypt        = true
#   }
# }
