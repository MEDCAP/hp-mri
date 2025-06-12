import os
import boto3
from botocore.config import Config
from pathlib import Path

class StorageService:
    def __init__(self):
        self.is_local = os.getenv('FLASK_ENV') == 'development'
        if self.is_local:
            self.local_path = os.getenv('LOCAL_STORAGE_PATH', './local_storage')
            os.makedirs(self.local_path, exist_ok=True)
            # Create necessary directories for local development
            self.dicom_path = os.path.join(self.local_path, 'MRS/proton')
            self.dataset_path = os.path.join(self.local_path, 'MRS/epsi')
            os.makedirs(self.dicom_path, exist_ok=True)
            os.makedirs(self.dataset_path, exist_ok=True)
        else:
            self.s3 = boto3.client('s3',
                config=Config(signature_version='s3v4'),
                region_name=os.getenv('AWS_DEFAULT_REGION')
            )
            self.bucket = os.getenv('S3_BUCKET', 'medcap-data')

    def list_objects(self, prefix, delimiter=None):
        if self.is_local:
            path = os.path.join(self.local_path, prefix)
            if not os.path.exists(path):
                return []
            if delimiter:
                return [f for f in os.listdir(path) if os.path.isdir(os.path.join(path, f))]
            return [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
        else:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix,
                Delimiter=delimiter
            )
            if delimiter:
                return [obj['Prefix'] for obj in response.get('CommonPrefixes', [])]
            return [obj['Key'] for obj in response.get('Contents', [])]

    def read_file(self, file_path):
        if self.is_local:
            full_path = os.path.join(self.local_path, file_path)
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"File not found: {full_path}")
            with open(full_path, 'rb') as f:
                return f.read()
        else:
            response = self.s3.get_object(Bucket=self.bucket, Key=file_path)
            return response['Body'].read()

    def write_file(self, file_path, data):
        if self.is_local:
            full_path = os.path.join(self.local_path, file_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, 'wb') as f:
                f.write(data)
        else:
            self.s3.put_object(Bucket=self.bucket, Key=file_path, Body=data)

    def download_file(self, file_path, local_path):
        if self.is_local:
            full_path = os.path.join(self.local_path, file_path)
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"File not found: {full_path}")
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(full_path, 'rb') as src, open(local_path, 'wb') as dst:
                dst.write(src.read())
        else:
            self.s3.download_file(self.bucket, file_path, local_path) 