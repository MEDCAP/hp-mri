"""
The pipeline stages, and the codespec each one renders to.

Ported verbatim from ~/dev/mrs_to_mrd/tyger_deploy/*_codespec.yml: image,
resources, nodePool, cluster and timeoutSeconds. The peak arguments vary per
run, so the codespecs cannot stay static files -- each stage declares itself
here and renders a codespec to a temp file per run.

Three stages, not the five the tyger_deploy directory suggests.
mrs_to_mrd/Dockerfile builds exactly `convert`, `shift` and `recon`; there is no
build target behind convert_epsi_codespec.yml or convert_spectral_codespec.yml,
and both pass `--input/--output`, which MRStomrd2.py's parser does not accept
(it takes -t/--tar, -f/--folder, -o/--output, -n, -w). Registering either would
mean an image that cannot be pulled running argv it would reject. They become
one table entry each on the day the images exist.

Nothing here has been verified end to end against the live cluster: tyger
reaches it and transfers buffers, but every `ghcr.io/medcap/*` image returns 403
to an anonymous pull and the cluster has no pull secret for that namespace, so
each run dies in ImagePullBackOff. The unit tests mock subprocess.run for that
reason.

This module is also where untrusted input stops. Everything built here becomes
argv on a container, so a parameter is matched against a pattern and refused
rather than escaped: `pyr; rm -rf /` is not a peak name.

The codespec is rendered as text rather than dumped with PyYAML. The document
is fixed except for the args list, every value in it has already been validated
down to `[-A-Za-z0-9_.$()]`, and the alternative is a dependency the server does
not otherwise have.
"""
import re
from dataclasses import dataclass
from typing import Callable

from app.errors import BadRequest

# No underscore: the recon CLI splits a peak token at its first one, so
# `-my_peak 1.0` is the peak "my" with modifiers "peak"
# (mrd2recon.py::split_peak_args).
_PEAK_NAME = re.compile(r"^[A-Za-z][A-Za-z0-9]*$")

# _s source (the injected substrate), _t tiny, _m derived metabolite. A peak may
# carry more than one, e.g. `-ala_tm 15.2`.
_PEAK_MODIFIERS = frozenset("stm")

# The recon CLI's own numeric options, which split_peak_args knows to leave for
# argparse. Anything not in its reserved set is read as a peak instead, which is
# why this table exists rather than a passthrough for arbitrary flags.
_RECON_OPTIONS = {
    "line_broadening": "-lb",
    "fit_df": "-df",
    "fit_dw": "-dw",
    "fit_dph": "-dph",
}

_BUFFER_IN = "$(INPUT_PIPE)"
_BUFFER_OUT = "$(OUTPUT_PIPE)"


@dataclass(frozen=True)
class Stage:
    """One container stage: what to run it as, and how to build its argv."""

    id: str
    image: str
    cpu: int
    memory: str
    node_pool: str
    cluster: str
    timeout_seconds: int
    build_args: Callable[[dict], list]


def _reject_unknown_params(stage_id, params, allowed=()):
    if params is None:
        return {}
    if not isinstance(params, dict):
        raise BadRequest(f"Parameters for the {stage_id} stage must be an object.")
    unknown = sorted(set(params) - set(allowed))
    if unknown:
        raise BadRequest(
            f"The {stage_id} stage does not take {', '.join(unknown)}."
        )
    return params


def _as_float(value, label):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise BadRequest(f"{label} must be a number.") from None


def _fixed_args(stage_id, flag_in, flag_out):
    def build(params):
        _reject_unknown_params(stage_id, params)
        return [flag_in, _BUFFER_IN, flag_out, _BUFFER_OUT]

    return build


def _peak_flag(peak):
    if not isinstance(peak, dict):
        raise BadRequest("Each peak must be an object.")

    name = peak.get("name")
    if isinstance(name, str) and "_" in name:
        raise BadRequest(
            f"Peak name {name!r} may not contain an underscore: the recon CLI "
            "reads everything after the first one as modifiers."
        )
    if not isinstance(name, str) or not _PEAK_NAME.match(name):
        raise BadRequest(f"{name!r} is not a valid peak name.")

    modifiers = peak.get("modifiers") or ""
    if not isinstance(modifiers, str) or set(modifiers) - _PEAK_MODIFIERS:
        raise BadRequest(
            f"Peak {name} has unknown modifiers {modifiers!r}; "
            "expected some of s, t, m."
        )

    ppm = _as_float(peak.get("ppm"), f"The offset for peak {name}")
    suffix = f"_{modifiers}" if modifiers else ""
    return [f"-{name}{suffix}", str(ppm)]


def _recon_args(params):
    params = _reject_unknown_params(
        "recon", params, allowed=("peaks", *_RECON_OPTIONS)
    )

    peaks = params.get("peaks") or []
    if not isinstance(peaks, list) or not peaks:
        raise BadRequest("The recon stage needs at least one peak.")

    args = ["-i", _BUFFER_IN, "-o", _BUFFER_OUT]
    for peak in peaks:
        args += _peak_flag(peak)

    for key, flag in _RECON_OPTIONS.items():
        if params.get(key) is not None:
            args += [flag, str(_as_float(params[key], f"{key} for the recon stage"))]

    return args


STAGES = {
    "convert": Stage(
        id="convert",
        image="ghcr.io/medcap/mrs-convert:latest",
        cpu=1,
        # the whole scan is held in memory: the format's parameter block sits
        # after the data at EOF, and the header needs the phantom count across
        # every file before the first write
        memory="2G",
        node_pool="cpunp",
        cluster="tep-centralus-1",
        timeout_seconds=3600,
        build_args=_fixed_args("convert", "-t", "-o"),
    ),
    "shift": Stage(
        id="shift",
        image="ghcr.io/medcap/mrs-shift:latest",
        # the drift search sweeps the whole switch train per candidate slope,
        # over acquisitions that are all in memory at once
        cpu=2,
        memory="4G",
        node_pool="cpunp",
        cluster="tep-centralus-1",
        timeout_seconds=3600,
        build_args=_fixed_args("shift", "-i", "-o"),
    ),
    "recon": Stage(
        id="recon",
        image="ghcr.io/medcap/mrs-recon:latest",
        # the fit runs once on the summed spectrum and then once per voxel per
        # repetition, and the whole acquisition set is buffered before any of it
        # is written
        cpu=4,
        memory="8G",
        node_pool="cpunp",
        cluster="tep-centralus-1",
        timeout_seconds=3600,
        build_args=_recon_args,
    ),
}


def get_stage(stage_id):
    """The stage with this id, or BadRequest."""
    try:
        return STAGES[stage_id]
    except (KeyError, TypeError):
        raise BadRequest(f"{stage_id!r} is not a pipeline stage.") from None


def build_args(stage_id, params=None):
    """The validated argv for a stage."""
    return get_stage(stage_id).build_args(params)


def render_codespec(stage_id, params=None):
    """The codespec YAML text for one run of a stage."""
    stage = get_stage(stage_id)
    args = "\n".join(f'      - "{arg}"' for arg in stage.build_args(params))
    return (
        "job:\n"
        "  codespec:\n"
        f"    image: {stage.image}\n"
        "    buffers:\n"
        '      inputs: ["input"]\n'
        '      outputs: ["output"]\n'
        "    args:\n"
        f"{args}\n"
        "    resources:\n"
        "      requests:\n"
        f"        cpu: {stage.cpu}\n"
        f"        memory: {stage.memory}\n"
        "  tags:\n"
        '    version: "1.0"\n'
        f"  nodePool: {stage.node_pool}\n"
        "  replicas: 1\n"
        f"cluster: {stage.cluster}\n"
        f"timeoutSeconds: {stage.timeout_seconds}\n"
    )
