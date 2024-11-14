import mrd
import os
import datetime

filename = 'test_mrd.bin'

with mrd.BinaryMrdReader(filename) as r:
    h = r.read_header()
    
    # fields to be set by reading mrd file upon upload
    measurement_id = h.measurement_information.measurement_id    # primary key on DynamoDB
    study_date = h.study_information.study_date
    vendor = h.acquisition_system_information.system_vendor
    model = h.acquisition_system_information.system_model
    field_strength = h.acquisition_system_information.system_field_strength_t
    scanner_type = vendor+'-'+model+'-'+str(field_strength)+'T'
    file_size = os.stat(filename).st_size   # file size in bytes

    print(measurement_id)
    print(study_date)
    print(scanner_type)
    print(file_size)

    data_stream = r.read_data()
    for item in data_stream:
        if isinstance(item, (mrd.StreamItem.ImageComplexDouble,
                             mrd.StreamItem.ImageComplexFloat,
                             mrd.StreamItem.ImageDouble,
                             mrd.StreamItem.ImageFloat,
                             mrd.StreamItem.ImageInt,
                             mrd.StreamItem.ImageUint,
                             mrd.StreamItem.ImageUint16,
                             mrd.StreamItem.ImageInt16)):
            # if an image already exists, encode that to imagedb on dynamoDB
            if item.value is None:
                print(item.value)
                continue
            else:
                pass
                # encode image to dynamoDB 
                # update number of recon images on MRD-db

    # fields to be set with manual input
    # 
    # subject_type: human or animal
    # operator_name
    # subject_id
    # constrast_agent
    # project_name: save project name in db_project on dynamoDB