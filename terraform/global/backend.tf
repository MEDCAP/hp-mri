terraform {
  backend "s3" {
    bucket         = "medcap-tfstate-862065604168"
    key            = "global/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "medcap-tfstate-lock"
    encrypt        = true
  }
}
