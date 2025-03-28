import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class HpMriStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. S3 Bucket for the frontend static website
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy the frontend build files to the website bucket.
    // Assumes your frontend build output is in the "./frontend/build" directory.
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('./frontend/build')],
      destinationBucket: websiteBucket,
    });

    // 2. DynamoDB Table to track uploaded datasets/images
    const dataTable = new dynamodb.Table(this, 'DataTable', {
      partitionKey: { name: 'datasetId', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3. S3 Bucket to store the MRI data necessary
    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 4. Lambda function to sync the S3 data bucket with the DynamoDB table.
    // This function should be written in Node.js and located in the 'lambda/sync' directory.
    const syncFunction = new lambda.Function(this, 'SyncFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'sync.handler',
      code: lambda.Code.fromAsset('lambda/sync'),
      environment: {
        TABLE_NAME: dataTable.tableName,
      },
    });

    // Grant the sync function permissions to read/write the data bucket and the DynamoDB table.
    dataBucket.grantReadWrite(syncFunction);
    dataTable.grantReadWriteData(syncFunction);

    // Trigger the sync function on new object creations in the data bucket.
    dataBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(syncFunction));

    // 5. Lambda function to run the Flask backend application.
    // This example assumes you have a Python handler (e.g. in 'lambda/flask_backend/app.py').
    const flaskFunction = new lambda.Function(this, 'FlaskFunction', {
      runtime: lambda.Runtime.PYTHON_3_8,
      handler: 'app.handler',  // Ensure this matches your Flask Lambda handler
      code: lambda.Code.fromAsset('lambda/flask_backend'),
    });

    // Expose the Flask backend via API Gateway.
    const api = new apigateway.LambdaRestApi(this, 'FlaskApi', {
      handler: flaskFunction,
    });

    // Optional: Output the website and API URLs after deployment.
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'URL for the static website hosted on S3',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL for the Flask backend',
    });
  }
}

const app = new cdk.App();
new HpMriStack(app, 'HpMriStack');
