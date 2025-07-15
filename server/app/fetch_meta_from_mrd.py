from external.python.mrd import BinaryMrdReader

# Read mrd and extract meta data to be stored in mongoDB
filename = "external/phantom.bin"
with BinaryMrdReader(filename) as r:
    header = r.read_header()
    study_date = header.study_information.study_date
    study_time = header.study_information.study_time
    print(f"study date {study_date}, time {study_time}")
    data_stream = r.read_data()
    for item in data_stream:
        pass
        