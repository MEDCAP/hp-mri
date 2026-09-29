"""
What the viewer needs beyond a named array: the meta an array carries, the
k-space reduction, and the waveform traces.

The reductions are tested as arithmetic over synthetic stream items rather than
against a stored file. A golden .mrd2 would say the numbers have not changed; it
would not say the fold puts the echo where the echo is, which is the only thing
these figures are read for.
"""
import math
from types import SimpleNamespace
from unittest import mock

import numpy as np
import pytest

from data import (
    _describe_item,
    _header_nswitches,
    _meta_values,
    collect_waveforms,
    fold_kspace,
)

OID = "507f1f77bcf86cd799439011"


@pytest.fixture()
def visible():
    """Let a guest see every file, so a route test reaches the reduction."""
    with mock.patch("app.viewer.routes.get_public_mrdfile_by_id",
                    return_value={"_id": OID}) as check:
        yield check

NSWITCH = 8
TOTAL = 16
DISCARD_PRE = 2
DISCARD_POST = 2


def _meta(**entries):
    """A meta dict as an MRD file holds it: values wrapped in their union case."""
    tags = {str: "string", int: "int64", float: "float64"}
    return {
        key: [SimpleNamespace(tag=tags[type(value)], value=value)
              for value in values]
        for key, values in entries.items()
    }


def _acquisition(echo_column, *, ref=0, flags=0, samples=NSWITCH * TOTAL,
                 amplitude=1.0):
    """
    One readout whose echo sits on a known column of every switch.

    Zero everywhere else, so the fold has exactly one right answer.
    """
    row = np.zeros(samples, dtype=np.complex64)
    if echo_column is not None:
        for switch in range(samples // TOTAL):
            row[switch * TOTAL + echo_column] = amplitude
    return SimpleNamespace(
        data=row[np.newaxis, :],
        head=SimpleNamespace(encoding_space_ref=ref, flags=flags,
                             discard_pre=DISCARD_PRE, discard_post=DISCARD_POST,
                             sample_time_ns=1000, acquisition_time_stamp_ns=0),
    )


# --- array meta --------------------------------------------------------------

def test_meta_values_unwraps_each_union_case_to_a_json_safe_type():
    values = _meta_values(_meta(
        peak_names=["pyr", "lac"],
        peak_offsets_ppm=[9.7, 21.8],
        biggest_peak_index=[0],
    ))

    assert values == {
        "peak_names": ["pyr", "lac"],
        "peak_offsets_ppm": [9.7, 21.8],
        "biggest_peak_index": [0],
    }


def test_a_non_finite_meta_value_becomes_null_rather_than_bare_nan():
    """A fit that did not converge records a NaN loss, which JSON.parse rejects."""
    assert _meta_values(_meta(fit_loss=[float("nan")])) == {"fit_loss": [None]}


def test_an_array_descriptor_carries_its_meta():
    """
    The fitted spectrum cannot be drawn without the ppm axis and the peak
    pattern, and this is the only place they are in hand.
    """
    array = SimpleNamespace(
        data=np.arange(8.0),
        head=SimpleNamespace(meta=_meta(description=["metabolite_global_spect"],
                                        xscale_ppm=[0.0, 1.0],
                                        peak_names=["pyr"],
                                        biggest_peak_name=["pyr"])),
    )

    kind, name, _dim_labels, _labels, _extra, meta = _describe_item(
        "ndArrayFloat", array
    )

    assert (kind, name) == ("trace", "metabolite_global_spect")
    assert meta["xscale_ppm"] == [0.0, 1.0]
    assert meta["peak_names"] == ["pyr"]
    assert meta["biggest_peak_name"] == ["pyr"]


# --- k-space -----------------------------------------------------------------

def test_the_switch_count_comes_from_the_header_the_converter_wrote():
    header = SimpleNamespace(user_parameters=SimpleNamespace(
        user_parameter_long=[SimpleNamespace(name="something", value=3),
                             SimpleNamespace(name="nswitches", value=64)]
    ))
    assert _header_nswitches(header) == 64
    assert _header_nswitches(SimpleNamespace(user_parameters=None)) == 0


def test_the_fold_puts_the_echo_on_the_column_it_was_placed_on():
    encodings = fold_kspace(NSWITCH, [_acquisition(echo_column=9)])
    encoding = encodings[0]

    signal = np.array(encoding["signal"])
    assert signal.shape == (NSWITCH, TOTAL)
    assert encoding["brightest"] == [9] * NSWITCH
    assert signal[:, 9].tolist() == [1.0] * NSWITCH
    assert signal.sum() == NSWITCH


def test_a_drifting_echo_shows_up_as_a_drifting_column():
    """The walk across the columns is what the shift stage takes out."""
    row = np.zeros(NSWITCH * TOTAL, dtype=np.complex64)
    for switch in range(NSWITCH):
        row[switch * TOTAL + 3 + switch] = 1.0
    drifting = SimpleNamespace(
        data=row[np.newaxis, :],
        head=SimpleNamespace(encoding_space_ref=0, flags=0,
                             discard_pre=DISCARD_PRE, discard_post=DISCARD_POST),
    )

    encoding = fold_kspace(NSWITCH, [drifting])[0]

    assert encoding["brightest"] == [3 + switch for switch in range(NSWITCH)]


def test_readouts_are_summed_over_views_and_repetitions():
    acquisitions = [_acquisition(echo_column=9, amplitude=a) for a in (1.0, 2.0, 3.0)]

    encoding = fold_kspace(NSWITCH, acquisitions)[0]

    assert np.array(encoding["signal"])[:, 9].tolist() == [6.0] * NSWITCH


def test_the_window_and_the_expected_echo_come_from_the_discards():
    encoding = fold_kspace(NSWITCH, [_acquisition(echo_column=8)])[0]

    assert encoding["total"] == TOTAL
    assert encoding["discard_pre"] == DISCARD_PRE
    assert encoding["kept"] == TOTAL - DISCARD_PRE - DISCARD_POST
    # The echo belongs at the middle of the kept window, where k-space crosses
    # zero, and this readout put it there.
    assert encoding["echo"] == 8
    assert encoding["brightest"] == [8] * NSWITCH


def test_each_encoding_space_folds_separately():
    encodings = fold_kspace(NSWITCH, [
        _acquisition(echo_column=4, ref=0),
        _acquisition(echo_column=11, ref=1),
    ])

    assert [e["ref"] for e in encodings] == [0, 1]
    assert encodings[0]["brightest"] == [4] * NSWITCH
    assert encodings[1]["brightest"] == [11] * NSWITCH
    assert [e["name"] for e in encodings] == ["encoding 0", "encoding 1"]


def test_the_averaged_prescan_is_left_out():
    """It calibrates a reconstruction rather than being reconstructed."""
    noise = 1 << 18  # IS_NOISE_MEASUREMENT

    encodings = fold_kspace(NSWITCH, [
        _acquisition(echo_column=4, ref=0, flags=noise),
        _acquisition(echo_column=4, ref=0, flags=noise),
        _acquisition(echo_column=7, ref=1),
    ])

    assert [e["ref"] for e in encodings] == [1]


def test_an_acquisition_at_another_geometry_belongs_in_no_row():
    encodings = fold_kspace(NSWITCH, [
        _acquisition(echo_column=5),
        _acquisition(echo_column=5, samples=NSWITCH * TOTAL // 2),
    ])

    assert np.array(encodings[0]["signal"]).sum() == NSWITCH


def test_a_file_with_no_switch_count_folds_to_nothing():
    """Which is how a spectral file looks, and why the route 404s on one."""
    assert fold_kspace(0, [_acquisition(echo_column=4)]) == []
    assert fold_kspace(1, [_acquisition(echo_column=4)]) == []


@pytest.mark.usefixtures("visible")
def test_kspace_route_returns_the_reduction(client):
    reduction = {"nswitch": 8, "encodings": [{"ref": 0}]}
    with mock.patch("app.viewer.routes.reduce_kspace", return_value=reduction):
        response = client.get(f"/api/viewer/{OID}/kspace")

    assert response.status_code == 200
    assert response.get_json() == reduction


@pytest.mark.usefixtures("visible")
def test_kspace_route_404s_a_file_with_no_epsi_readout(client):
    with mock.patch("app.viewer.routes.reduce_kspace", return_value=None):
        response = client.get(f"/api/viewer/{OID}/kspace")

    assert response.status_code == 404
    assert response.get_json()["error"] == "This file carries no EPSI readout."


# --- waveforms ---------------------------------------------------------------

def _pulse(samples=5000, channels=2):
    return ("pulse", SimpleNamespace(
        amplitude=np.ones((channels, samples)),
        head=SimpleNamespace(sample_time_ns=1000, pulse_time_stamp_ns=10 ** 9),
    ))


def _gradient(samples=100):
    ramp = np.linspace(0.0, 1.0, samples)
    return ("gradient", SimpleNamespace(
        rl=ramp, ap=ramp * 2, fh=ramp * 3,
        head=SimpleNamespace(gradient_sample_time_ns=10 ** 4,
                             gradient_time_stamp_ns=0),
    ))


def _acquisition_item(samples=10):
    data = (np.arange(samples) + 1j * np.arange(samples)).reshape(1, samples)
    return ("acquisition", SimpleNamespace(
        data=data,
        head=SimpleNamespace(sample_time_ns=10 ** 6,
                             acquisition_time_stamp_ns=2 * 10 ** 9),
    ))


def test_each_group_is_drawn_from_the_items_that_belong_to_it():
    traces = collect_waveforms([_pulse(), _gradient(), _acquisition_item()])

    assert [t["name"] for t in traces["pulses"]] == ["pulse 0 channel 0",
                                                     "pulse 0 channel 1"]
    assert [t["name"] for t in traces["gradients"]] == ["gradient 0 rl",
                                                        "gradient 0 ap",
                                                        "gradient 0 fh"]
    assert [t["name"] for t in traces["acquisitions"]] == ["acquisition 0 real",
                                                           "acquisition 0 imaginary"]


def test_a_trace_is_thinned_to_the_point_budget_and_says_by_how_much():
    traces = collect_waveforms([_pulse(samples=5000)], max_points=100)
    trace = traces["pulses"][0]

    # A zero either side of the pulse, so the shape reads as a shape.
    assert trace["samples"] == 5002
    assert trace["stride"] == 51
    assert len(trace["values"]) <= 100
    assert len(trace["t"]) == len(trace["values"])
    assert traces["decimation"]["max_points_per_trace"] == 100


def test_a_short_trace_is_left_alone():
    trace = collect_waveforms([_acquisition_item(samples=10)])["acquisitions"][0]

    assert trace["stride"] == 1
    assert len(trace["values"]) == 10


def test_times_are_seconds_from_the_item_stamp():
    trace = collect_waveforms([_acquisition_item(samples=4)])["acquisitions"][0]

    assert trace["t"] == [2.0, 2.001, 2.002, 2.003]
    assert trace["values"] == [0.0, 1.0, 2.0, 3.0]


def test_the_item_budget_is_reported_rather_than_silently_applied():
    traces = collect_waveforms([_acquisition_item() for _ in range(5)],
                               max_traces=2)

    assert len(traces["acquisitions"]) == 4
    assert traces["decimation"]["items_omitted"]["acquisitions"] == 3
    assert traces["decimation"]["items_omitted"]["pulses"] == 0


@pytest.mark.usefixtures("visible")
def test_a_file_carrying_none_of_them_is_an_empty_answer_not_an_error(client):
    empty = {"pulses": [], "gradients": [], "acquisitions": [],
             "decimation": {"items_omitted": {}}}
    with mock.patch("app.viewer.routes.waveform_traces", return_value=empty):
        response = client.get(f"/api/viewer/{OID}/waveforms")

    assert response.status_code == 200
    assert response.get_json() == empty


@pytest.mark.parametrize("route", ["kspace", "waveforms"])
@pytest.mark.usefixtures("visible")
def test_a_missing_object_is_404_on_both_routes(client, route):
    target = {"kspace": "app.viewer.routes.reduce_kspace",
              "waveforms": "app.viewer.routes.waveform_traces"}[route]
    with mock.patch(target, side_effect=FileNotFoundError(OID)):
        assert client.get(f"/api/viewer/{OID}/{route}").status_code == 404


def test_float_rounding_keeps_values_json_safe():
    trace = collect_waveforms([_gradient(samples=3)])["gradients"][0]

    assert all(math.isfinite(value) for value in trace["values"])


# --- the routes over a real stream ------------------------------------------

@pytest.mark.parametrize("route", ["kspace", "waveforms"])
def test_a_file_the_caller_cannot_see_is_404_and_never_downloaded(
        client, user, s3_object, route):
    get_object = s3_object()
    with mock.patch("app.viewer.routes.get_public_mrdfile_by_id", return_value=None):
        assert client.get(f"/api/viewer/{OID}/{route}").status_code == 404
    with mock.patch("app.viewer.routes.get_mrdfile_by_id_with_auth",
                    return_value=None) as check:
        assert client.get(f"/api/viewer/{OID}/{route}",
                          headers=user("sub-2")).status_code == 404
    check.assert_called_once_with(OID, "sub-2")
    get_object.assert_not_called()


@pytest.mark.parametrize("route", ["kspace", "waveforms"])
@pytest.mark.usefixtures("visible")
def test_an_object_that_is_not_mrd_is_422_without_detail(client, s3_object, route):
    s3_object(b"definitely not an mrd stream")
    response = client.get(f"/api/viewer/{OID}/{route}")
    assert response.status_code == 422
    assert response.get_json() == {"error": "This file could not be read as MRD",
                                   "code": "unreadable"}


@pytest.mark.usefixtures("visible")
def test_a_stream_with_no_switch_count_has_no_kspace(client, s3_object):
    s3_object()
    response = client.get(f"/api/viewer/{OID}/kspace")
    assert response.status_code == 404
    assert response.get_json()["error"] == "This file carries no EPSI readout."


@pytest.mark.usefixtures("visible")
def test_waveforms_of_a_stream_with_no_acquisitions_are_empty_groups(client, s3_object):
    s3_object()
    body = client.get(f"/api/viewer/{OID}/waveforms").get_json()
    assert body["pulses"] == body["gradients"] == body["acquisitions"] == []


@pytest.mark.usefixtures("visible")
def test_the_array_list_carries_each_arrays_meta(client, s3_object):
    s3_object()
    arrays = client.get(f"/api/viewer/{OID}/arrays").get_json()["arrays"]
    assert all(isinstance(array["meta"], dict) for array in arrays)
