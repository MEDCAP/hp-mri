# read mrd file to view or reconstruct

import boto3
import os
from mapvbvd import mapVBVD
import mrd

def handler(event, context):
    s3 = boto3.client('s3')

    bucket = event["bucket"]
    key = event["key"]
    response = s3.get_object(Bucket=bucket, Key=key)
    
    try:
        local_filename = '/tmp/' + key
        s3.download_file(bucket, key, local_filename)
        with mrd.BinaryMrdReader(local_filename) as r:
            h = r.read_header()
            measurement_id = h.measurement_information.measurement_id    # primary key on DynamoDB
            study_date = h.study_information.study_date
            vendor = h.acquisition_system_information.system_vendor
            model = h.acquisition_system_information.system_model
            field_strength = h.acquisition_system_information.system_field_strength_t
            scanner_type = vendor+'-'+model+'-'+str(field_strength)+'T'
            data_stream = r.read_data()
            for item in data_stream:
                pass
        # remove local files
        os.remove(local_filename)

    except Exception as e:
        return {"error": str(e)}
        
    return {local_filename: os.path.isfile(local_filename),
            'scanner_type': scanner_type}