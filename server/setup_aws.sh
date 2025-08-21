#!/bin/bash

# Script to export AWS credentials to .env.development in the server directory

# Exit on error
set -e

# login to aws as federated credential
aws-federated-auth

# Export AWS credentials
echo "Exporting AWS credentials to .env.development..."
aws configure export-credentials --profile aws-medcap-psom-PennResearcher --format env-no-export > .env.development

# set AWS_PROFILE to be aws-medcap-psom-PennResearcher for mac and windows
echo "export AWS_PROFILE=aws-medcap-psom-PennResearcher"

# Check result and set permissions
if [ $? -eq 0 ]; then
    echo "Credentials exported successfully"
    chmod 600 .env.development  # Secure permissions - owner read/write only
else
    echo "Failed to export credentials"
    exit 1
fi

echo "Done!"
