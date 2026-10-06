"""
read_mrdfile_header against headers with absent optional sections, as the
mrs-convert stage writes them (measurement information only).
"""
import io

from app.external.python import mrd
from data import read_mrdfile_header
from mrd_fixtures import build_mrd_bytes


def _stream(header):
    buffer = io.BytesIO()
    with mrd.BinaryMrdWriter(buffer) as writer:
        writer.write_header(header)
        writer.write_data([])
    buffer.seek(0)
    return buffer


def _read(header, **kw):
    return read_mrdfile_header(_stream(header), original_filename="scan.tar", file_size=1, **kw)


def test_a_converted_header_with_measurement_information_only_is_parsed():
    header = mrd.Header(measurement_information=mrd.MeasurementInformationType(
        measurement_id="cirrhrat_43_1", protocol_name="cirrhrat"))

    doc = _read(header, owner_name="Kento")

    assert "parse_error" not in doc
    assert doc["fileName"] == "MIDcirrhrat_43_1-cirrhrat"
    assert doc["measurementId"] == "cirrhrat_43_1"
    assert doc["protocolName"] == "cirrhrat"
    assert doc["ownerName"] == "Kento"
    assert doc["studyDate"] == doc["studyTime"] == "unknown"
    assert doc["subjectType"] == doc["stationName"] == "unknown"


def test_an_empty_header_is_parsed_with_unknowns_not_a_parse_error():
    doc = _read(mrd.Header())

    assert "parse_error" not in doc
    assert doc["fileName"] == "MIDunknown-unknown"
    assert doc["ownerName"] == "unknown"


def test_a_stream_with_images_is_reconstructed_and_still_parses():
    # Images come first in the fixture, so a reader that stops at the first
    # one leaves the stream unconsumed -- which the MRD reader rejects.
    doc = read_mrdfile_header(io.BytesIO(build_mrd_bytes()), original_filename="r.mrd", file_size=1)

    assert "parse_error" not in doc
    assert doc["isReconstructed"] is True


def test_raw_acquisitions_alone_are_not_reconstructed():
    assert _read(mrd.Header())["isReconstructed"] is False


def test_a_full_header_keeps_its_values():
    header = mrd.Header(
        subject_information=mrd.SubjectInformationType(patient_name="rat"),
        study_information=mrd.StudyInformationType(study_date=None),
        measurement_information=mrd.MeasurementInformationType(measurement_id="42", protocol_name="epsi"),
        acquisition_system_information=mrd.AcquisitionSystemInformationType(station_name="HUPC"),
    )

    doc = _read(header)

    assert doc["fileName"] == "MID42-epsi"
    assert doc["ownerName"] == doc["subjectType"] == "rat"
    assert doc["stationName"] == "HUPC"
