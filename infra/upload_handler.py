from PIL import Image
import boto3, os

s3 = boto3.client('s3')
dynamo = boto3.resource('dynamodb')
table = dynamo.Table(os.environ['METADATA_TABLE'])

def lambda_handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        tmp_path = '/tmp/' + os.path.basename(key)
        s3.download_file(bucket, key, tmp_path)
        img = Image.open(tmp_path)
        metadata = img.getexif()
        # extract and transform metadata as needed…
        table.put_item(Item={'id': key, **metadata})
        new_key = f"{metadata['DateTime']}_{os.path.basename(key)}"
        s3.copy_object(Bucket=bucket, CopySource={'Bucket':bucket,'Key':key}, Key=new_key)
        s3.delete_object(Bucket=bucket, Key=key)
