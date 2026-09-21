"""
The stage table, and the boundary it is.

Everything build_args produces becomes argv on a container, so the rejection
tests here are security assertions rather than validation niceties.

The codespecs under tests/fixtures/codespecs are copies of the ones in
~/dev/mrs_to_mrd/tyger_deploy. They are the source this table was ported from,
and checking against them is what catches the table drifting away from the
images it describes.
"""
import re
from pathlib import Path

import pytest

from app.errors import BadRequest
from app.tyger.stages import STAGES, build_args, render_codespec

FIXTURES = Path(__file__).parent / "fixtures" / "codespecs"

EXAMPLE_PEAKS = [
    {"name": "bic", "modifiers": "tm", "ppm": 0.0},
    {"name": "urea", "ppm": 2.3},
    {"name": "pyr", "modifiers": "s", "ppm": 9.7},
    {"name": "ala", "modifiers": "tm", "ppm": 15.2},
    {"name": "hyd", "modifiers": "tm", "ppm": 18.1},
    {"name": "lac", "modifiers": "m", "ppm": 21.8},
]


def _scalar(text, key):
    return re.search(rf"^\s*{key}:\s*(\S+)\s*$", text, re.MULTILINE).group(1)


def _args(text):
    """The args list of a codespec, without the comment lines inside it."""
    block = re.search(r"^\s*args:\n((?:\s*(?:-|#).*\n)+)", text, re.MULTILINE).group(1)
    values = []
    for line in block.splitlines():
        line = line.strip()
        if line.startswith("- "):
            values.append(line[2:].strip().strip('"'))
    return values


def test_only_the_three_stages_with_real_images_are_registered():
    """
    mrs_to_mrd/Dockerfile builds convert, shift and recon. The epsi and spectral
    codespecs name images with no build target and pass argv MRStomrd2.py's
    parser rejects, so registering them would only produce runs that cannot start.
    """
    assert set(STAGES) == {"convert", "shift", "recon"}


def test_convert_reads_the_tar_from_the_input_pipe():
    assert build_args("convert") == [
        "-t", "$(INPUT_PIPE)", "-o", "$(OUTPUT_PIPE)",
    ]


def test_shift_uses_short_flags():
    assert build_args("shift") == [
        "-i", "$(INPUT_PIPE)", "-o", "$(OUTPUT_PIPE)",
    ]


def test_recon_emits_one_flag_per_peak():
    assert build_args("recon", {"peaks": EXAMPLE_PEAKS}) == [
        "-i", "$(INPUT_PIPE)", "-o", "$(OUTPUT_PIPE)",
        "-bic_tm", "0.0",
        "-urea", "2.3",
        "-pyr_s", "9.7",
        "-ala_tm", "15.2",
        "-hyd_tm", "18.1",
        "-lac_m", "21.8",
    ]


def test_recon_argv_matches_the_checked_in_codespec():
    reference = _args((FIXTURES / "recon_codespec.yml").read_text())
    assert build_args("recon", {"peaks": EXAMPLE_PEAKS}) == reference


def test_a_negative_offset_survives_as_a_number():
    assert build_args("recon", {"peaks": [{"name": "bic", "ppm": "-0.4"}]})[-2:] == [
        "-bic", "-0.4",
    ]


def test_the_optional_fit_options_are_omitted_unless_given():
    """
    split_peak_args reads any `-xxx <float>` outside argparse's reserved set as
    a peak, so an invented flag would silently become one and bend the fit.
    """
    assert build_args("recon", {"peaks": EXAMPLE_PEAKS[:1]}) == [
        "-i", "$(INPUT_PIPE)", "-o", "$(OUTPUT_PIPE)", "-bic_tm", "0.0",
    ]

    assert build_args("recon", {
        "peaks": EXAMPLE_PEAKS[:1],
        "line_broadening": 42,
        "fit_df": 0.1,
        "fit_dw": "0.2",
        "fit_dph": 0.3,
    })[-8:] == ["-lb", "42.0", "-df", "0.1", "-dw", "0.2", "-dph", "0.3"]


def test_wiggle_is_not_a_recon_parameter():
    """The upstream successor to wiggle is -df; -w would parse as a peak."""
    with pytest.raises(BadRequest):
        build_args("recon", {"peaks": EXAMPLE_PEAKS[:1], "wiggle": 1.0})


@pytest.mark.parametrize("name", [
    "pyr; rm -rf /",
    "pyr && curl evil.example",
    "$(whoami)",
    "-i",
    "1pyr",
    "",
    None,
    {"name": "nested"},
])
def test_an_injection_shaped_peak_name_is_refused_not_escaped(name):
    with pytest.raises(BadRequest):
        build_args("recon", {"peaks": [{"name": name, "ppm": 1.0}]})


@pytest.mark.parametrize("ppm", ["nine point seven", None, "1.0; ls", "", {}, []])
def test_a_non_numeric_offset_is_refused(ppm):
    with pytest.raises(BadRequest):
        build_args("recon", {"peaks": [{"name": "pyr", "ppm": ppm}]})


def test_a_peak_name_with_an_underscore_is_refused_by_name():
    """
    `my_peak` would reach the CLI as peak "my" with modifiers "peak". Refusing
    it here, saying why, beats a confusing modifier error further down.
    """
    with pytest.raises(BadRequest, match="underscore"):
        build_args("recon", {"peaks": [{"name": "my_peak", "ppm": 1.0}]})


def test_an_unknown_modifier_is_refused():
    with pytest.raises(BadRequest):
        build_args("recon", {"peaks": [{"name": "pyr", "modifiers": "x", "ppm": 1.0}]})


def test_recon_needs_at_least_one_peak():
    with pytest.raises(BadRequest):
        build_args("recon", {"peaks": []})


@pytest.mark.parametrize("stage_id", ["convert_epsi", "convert_spectral", "nope", "", None])
def test_an_unknown_stage_id_is_refused(stage_id):
    with pytest.raises(BadRequest):
        build_args(stage_id)


@pytest.mark.parametrize("stage_id", ["convert", "shift"])
def test_a_stage_with_no_parameters_rejects_parameters(stage_id):
    with pytest.raises(BadRequest):
        build_args(stage_id, {"peaks": EXAMPLE_PEAKS})


def test_recon_rejects_a_parameter_it_does_not_know():
    with pytest.raises(BadRequest):
        build_args("recon", {"peaks": EXAMPLE_PEAKS, "lineBroadening": 42})


@pytest.mark.parametrize("stage_id", sorted(STAGES))
def test_rendered_codespec_matches_the_checked_in_image_and_resources(stage_id):
    params = {"peaks": EXAMPLE_PEAKS} if stage_id == "recon" else None
    rendered = render_codespec(stage_id, params)
    reference = (FIXTURES / f"{stage_id}_codespec.yml").read_text()

    for key in ("image", "cpu", "memory", "nodePool", "cluster",
                "timeoutSeconds", "replicas"):
        assert _scalar(rendered, key) == _scalar(reference, key), key


def test_rendered_codespec_quotes_every_argument():
    rendered = render_codespec("recon", {"peaks": EXAMPLE_PEAKS})
    assert '      - "-pyr_s"' in rendered
    assert '      - "9.7"' in rendered
