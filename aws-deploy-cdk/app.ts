import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class LambdaTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Docker-based Lambda function using the code in "server/aws_lambda"
    const handleDynamoLambda = new lambda.DockerImageFunction(this, 'HandleDynamoLambda', {
      functionName: 'HandleDynamoLambda',
      code: lambda.DockerImageCode.fromImageAsset('server/aws_lambda'),
    });
  }
}

const app = new cdk.App();
new LambdaTestStack(app, 'LambdaTestStack');
