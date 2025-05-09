import boto3
import numpy as np
import pydicom
import os
import struct

s3 = boto3.client('s3')
bucket_name = 'medcap-data'
folder = 'MRS/s_2023041103/epsi_16x12_13c_12.fid'
filename = 'fid'

def list_files_from_s3(bucket, folder):
    local = True
    if local:
        response = s3.list_objects_v2(Bucket=bucket, Prefix=folder)
        files = [obj['Key'] for obj in response.get('Contents', [])]
    print(files)
    return files

def get_from_s3(bucket, folder, filename):
    response = s3.get_object(Bucket=bucket, Key=f'{folder}/{filename}')
    blocks = struct.unpack(">i", response['Body'].read(4))[0]
    traces = struct.unpack(">i", response['Body'].read(4))[0]
    lines = struct.unpack(">i", response['Body'].read(4))[0]

    return [blocks, traces, lines]

def download_binary_from_s3(bucket, folder, file):
    s3.download_file(bucket, f'{folder}{file}', file)
    dcm_data = pydicom.dcmread(file)
    print(dcm_data)
    # remove local dcm file
    os.remove(file)
    return dcm_data

# files = list_files_from_s3(bucket_name, folder)
output = get_from_s3(bucket_name, folder, filename)
print(output)