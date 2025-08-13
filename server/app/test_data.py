import sys
import os
import boto3

# add filepath of parent directory
from pathlib import Path
import sys
path_root = Path(__file__).parents[1]
sys.path.insert(0, str(path_root))

import app.external.python.mrd as mrd

def read_mrd():
    s3 = boto3.client('s3')
    file_id = '689cb3741a8a4a66e314dc22'
    S3_BUCKET = 'medcap-data'
    obj = s3.get_object(Bucket=S3_BUCKET, Key=f'mrd_files/{file_id}')

    # filename = "images.bin"
    with mrd.BinaryMrdReader(obj['Body']) as r:
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