import sys
import os
import boto3
import io

# add filepath of parent directory
from pathlib import Path
import sys
path_root = Path(__file__).parents[1]
sys.path.insert(0, str(path_root))

import app.external.python.mrd as mrd

def read_mrd():
    s3 = boto3.client('s3')
    file_id = '68a301436b08cd8ee0dd41ed'
    S3_BUCKET = 'medcap-data'
    obj = s3.get_object(Bucket=S3_BUCKET, Key=f'mrd_files/{file_id}')

    # Load S3 StreamingBody into memory to ensure readinto support
    body_bytes = obj['Body'].read()
    with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as r:
        head = r.read_header()
        data_stream = r.read_data()
        acq_counter = 0
        img_counter = 0
        wf_counter = 0

        for item in data_stream:
            if isinstance(item, mrd.StreamItem.Acquisition):
                acq_counter += 1
                print("acquisition", item.value.data.shape)
            elif isinstance(item, mrd.StreamItem.ImageFloat):
                img_counter += 1
                print("image", item.value.data.shape)
            elif isinstance(item, mrd.StreamItem.WaveformUint32):
                wf_counter += 1
                print("waveform", item.value.data.shape)
        print("acq_counter", acq_counter)
        print("img_counter", img_counter)
        print("wf_counter", wf_counter)


if __name__ == "__main__":
    read_mrd()