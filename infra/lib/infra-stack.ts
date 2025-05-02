import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';


export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
    //BACKEND (dockerized flask)
    const flaskFn = new lambda.DockerImageFunction(this, 'FlaskFunction', {
      code: lambda.DockerImageCode.fromImageAsset('../server'), // I think this is where dockerfile is
    });

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      defaultIntegration: new HttpLambdaIntegration('FlaskIntegration', flaskFn),
    });

    const metadataTable = new dynamodb.Table(this, 'MetadataTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const bucket = new s3.Bucket(this, 'UploadBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    

    const uploadFn = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'upload_handler.lambda_handler',
      code: lambda.Code.fromAsset('../upload-lambda'),
      environment: { METADATA_TABLE: metadataTable.tableName }
    });
    metadataTable.grantWriteData(uploadFn);
    

    // uploadFn.addEventSource(new events.S3EventSource(bucket, {
    //   events: [s3.EventType.OBJECT_CREATED],
    // }));

    
  }
}
