'''
mongoDB CRUD operation using application context of flask
'''
from flask import current_app
from bson import ObjectId
from botocore.exceptions import ClientError
from collections import OrderedDict
from datetime import datetime
import logging
import os
import boto3
import numpy as np
import io

import app.external.python.mrd as mrd

logger = logging.getLogger(__name__)

def get_db(db_name=None):
    """
    Returns the MongoDB database instance from the current application context.

    No connectivity check is performed here. PyMongo does its own server
    discovery, monitoring and reconnection in the background, so pinging on
    every call only added a round-trip per data access.

    @param db_name: override the configured database; defaults to MONGO_DB_NAME
    """
    return current_app.mongo_client.get_database(
        db_name or current_app.config['MONGO_DB_NAME']
    )


_S3_CLIENT = None


def get_s3_client():
    """
    Process-wide S3 client.

    boto3 client construction resolves credentials and loads service models, so
    it belongs once per process rather than once per request.
    """
    global _S3_CLIENT
    if _S3_CLIENT is None:
        _S3_CLIENT = boto3.client("s3")
    return _S3_CLIENT

def list_all_mrdfiles(projection=None):
    """
    Retrieve list of mrd header from db sorted by studyDate in descending order
    """
    db = get_db()
    sort_condition = {"studyDate": -1,
                      "studyTime": -1}
    # cursor object cannot be re-iterated once excausted
    # convert to list to allow re-iteration
    cursor_list = list(db.mrdfiles.find({}, projection).sort(sort_condition))
    for doc in cursor_list:
        doc['_id'] = str(doc['_id'])
    return cursor_list


def get_mrdfile_by_id(file_id):
    """
    Retrieve mrdfile db entry by its ObjectId.
    """
    db = get_db()
    return db.mrdfiles.find_one({"_id": ObjectId(file_id)})

def delete_mrdfiles_by_ids(file_ids):
    """
    Deletes multiple mrdfile db entries based on a list of ObjectIds.
    """
    db = get_db()
    # Convert string ids to ObjectId
    object_ids = [ObjectId(id) for id in file_ids]
    result = db.mrdfiles.delete_many({"_id": {"$in": object_ids}})
    return result.deleted_count

def read_mrdfile_header(source, owner_name=None, original_filename=None, file_size=None):
    """
    Read the mrd file header as dict in mongodb mrd-files collection format

    :param source: Path to the MRD file, or a binary file-like object (e.g. io.BytesIO
                   wrapping an S3 object body).
    :param owner_name: Optional owner name (e.g., from Cognito user), defaults to patient_name from MRD header
    :param original_filename: Filename to record. Required when source is file-like;
                              derived from the path otherwise.
    :param file_size: Size in bytes to record. Required when source is file-like;
                      derived from the path otherwise.
    """
    # A file-like source has no name or size on disk, so the caller supplies both.
    if original_filename is None:
        original_filename = os.path.basename(source)
    if file_size is None:
        file_size = os.path.getsize(source)

    try:
        with mrd.BinaryMrdReader(source) as r:
            h = r.read_header()
            image_exist = False
            for item in r.read_data():
                if isinstance(item, (mrd.StreamItem.ImageFloat, mrd.StreamItem.ImageDouble)):
                    # One image is enough to answer the question; don't walk the
                    # rest of the stream.
                    image_exist = True
                    break

            # Use provided owner_name or fallback to patient_name from MRD header
            effective_owner_name = owner_name if owner_name else h.subject_information.patient_name

            header_for_db = {
                "fileName": 'MID' + h.measurement_information.measurement_id + '-' + h.measurement_information.protocol_name,
                "studyDate": str(h.study_information.study_date) if h.study_information.study_date else "unknown",
                "studyTime": str(h.study_information.study_time) if h.study_information.study_time else "unknown",
                "ownerName": effective_owner_name,
                "subjectType": h.subject_information.patient_name,
                "groupName": "public",
                "isReconstructed": image_exist,
                "protocolName": h.measurement_information.protocol_name,
                "measurementId": h.measurement_information.measurement_id,
                "stationName": h.acquisition_system_information.station_name,
                "original_filename": original_filename,
                "upload_timestamp": datetime.utcnow(),
                "file_size": file_size
            }
        return header_for_db
    except Exception as e:
        # Not a failure path: an unparseable file is still stored, with basic
        # metadata and the reason recorded so the uploader can see why. The full
        # traceback goes to the log; parse_error keeps the short reason, which is
        # genuinely useful to the researcher who uploaded it.
        logger.warning("MRD parsing failed for %s", original_filename, exc_info=True)
        # Create basic metadata for files that can't be parsed as MRD
        filename = original_filename
        # Use provided owner_name or "unknown" for failed parsing
        effective_owner_name = owner_name if owner_name else "unknown"
        basic_metadata = {
            "fileName": filename,
            "studyDate": "unknown",
            "studyTime": "unknown",
            "ownerName": effective_owner_name,
            "subjectType": "unknown",
            "groupName": "public",
            "isReconstructed": False,
            "protocolName": "unknown",
            "measurementId": os.path.splitext(filename)[0],
            "stationName": "unknown",
            "original_filename": filename,
            "upload_timestamp": datetime.utcnow(),
            "file_size": file_size,
            "parse_error": str(e)
        }
        return basic_metadata

def insert_mrdfile_header(header_data: dict, doc_id: ObjectId = None) -> ObjectId:
    """
    Insert single MRD file document into mongodb

    :param header_data: dict where each dictionary
                       represents an MRD file's metadata.
    :param doc_id: Optional explicit _id. The presigned upload flow mints the
                   ObjectId up front so the S3 key can be derived before the
                   document exists.
    :return: ObjectId of the inserted document.
    """
    # check if header_data is dict
    if not header_data or not isinstance(header_data, dict):
        raise ValueError("header_data must be a non-empty dictionary")

    if doc_id is not None:
        header_data = {**header_data, "_id": doc_id}

    db = get_db()
    # insert single mrd file header as single document
    result = db.mrdfiles.insert_one(header_data)
    # return the object id of inserted mrd header document
    return result.inserted_id

def insert_mrdfiles_batch(header_data_list: list) -> list:
    """
    Insert multiple MRD file documents into mongodb
    
    :param header_data_list: list of dictionaries where each dictionary 
                            represents an MRD file's metadata.
    :return: List of ObjectId objects for the inserted documents.
    """
    if not header_data_list or not isinstance(header_data_list, list):
        return []
    
    db = get_db()
    # insert multiple mrd file headers as documents
    result = db.mrdfiles.insert_many(header_data_list)
    # return the object ids of inserted mrd header documents
    return result.inserted_ids


# ---------------------------------------------------------------------------
# MRD array extraction
#
# The viewer lets each panel pick any named array in an MRD file, so everything
# below walks the stream generically. The MRD library is a generated (yardl)
# submodule whose StreamItem variants and header field names differ between
# revisions of the fork, so this code never does isinstance(item,
# mrd.StreamItem.X) and never reads a header attribute directly: it keys off
# the union case's `tag` and uses getattr() everywhere. That way a file written
# by a different fork revision degrades to "unsupported" instead of raising
# AttributeError.
# ---------------------------------------------------------------------------

# Downloaded MRD bytes, keyed by file_id. Listing a file's arrays and then
# fetching one of them would otherwise download the same object twice. Objects
# are immutable for a given ObjectId key, so entries never go stale. This is a
# per-process cache; each gunicorn worker holds its own.
_MRD_BYTES_CACHE = OrderedDict()
_MRD_BYTES_CACHE_MAX = 3

# Stream items that are never offered as arrays. Acquisitions are excluded
# deliberately: a raw file holds thousands of them and shipping k-space as JSON
# is not viable.
_SKIP_TAGS = frozenset({"acquisition", "acquisitionBucket", "reconData", "imageArray"})

# Meta keys checked, in order, for a human-readable array name.
_META_NAME_KEYS = ("name", "array_name", "label", "title", "description", "imagecomments")

# Canonical axis order of a `kind="image"` array, before the trailing
# measurement axis appended by stacking.
_IMAGE_AXES = ("CHANNEL", "Z", "Y", "X", "FREQUENCY")


def _fetch_mrd_bytes(file_id):
    """
    Download mrd_files/{file_id} from S3, with a small in-process LRU.

    @param file_id: file_id in mongodb of the mrd file
    @return: the raw object bytes
    @raise FileNotFoundError: if no such object exists in the bucket
    """
    cached = _MRD_BYTES_CACHE.get(file_id)
    if cached is not None:
        _MRD_BYTES_CACHE.move_to_end(file_id)
        return cached

    s3 = get_s3_client()
    try:
        obj = s3.get_object(
            Bucket=current_app.config['S3_BUCKET'],
            Key=f'mrd_files/{file_id}',
        )
    except ClientError as e:
        code = str(e.response.get("Error", {}).get("Code", ""))
        # Surface a missing object as FileNotFoundError so routes can 404 it.
        if code in ("NoSuchKey", "NoSuchBucket", "404"):
            raise FileNotFoundError(file_id) from e
        raise

    body_bytes = obj['Body'].read()
    _MRD_BYTES_CACHE[file_id] = body_bytes
    while len(_MRD_BYTES_CACHE) > _MRD_BYTES_CACHE_MAX:
        _MRD_BYTES_CACHE.popitem(last=False)
    return body_bytes


def _item_tag(item):
    """Union case tag of a stream item, e.g. 'imageFloat' or 'ndArrayDouble'."""
    return getattr(item, "tag", type(item).__name__)


def _enum_name(value):
    """Name of an enum member, or None if value is not one."""
    name = getattr(value, "name", None)
    return name if isinstance(name, str) else None


def _prettify(enum_name):
    """T1_MAP -> 'T1 map', MAGNITUDE -> 'Magnitude'."""
    words = enum_name.replace("_", " ").strip()
    return words[:1].upper() + words[1:].lower()


def _meta_string(meta):
    """
    First string-valued entry of an Image.meta / NdArrayHeader.meta dict whose
    key looks like a name. Values are union cases with .tag and .value.
    """
    if not meta:
        return None
    for wanted in _META_NAME_KEYS:
        for key, values in meta.items():
            if str(key).lower() != wanted:
                continue
            for value in values or []:
                if getattr(value, "tag", None) != "string":
                    continue
                text = str(getattr(value, "value", "")).strip()
                if text:
                    return text
    return None


def _meta_values(meta):
    """
    Every meta entry, unwrapped from its union case, as {key: [value, ...]}.

    A key maps to a list because several of the ones the viewer needs hold one
    value per peak: peak_names and peak_offsets_ppm are the fitted pattern, and
    a scalar like fit_loss is simply a list of one. Values are converted by
    their union tag so what leaves here is always JSON-safe.
    """
    values_by_key = {}
    for key, entries in (meta or {}).items():
        unwrapped = []
        for entry in entries or []:
            tag = getattr(entry, "tag", None)
            raw = getattr(entry, "value", None)
            try:
                if tag == "string":
                    unwrapped.append(str(raw))
                elif tag == "int64":
                    unwrapped.append(int(raw))
                elif tag == "float64":
                    number = float(raw)
                    # A fit that did not converge records a NaN loss, and bare
                    # NaN is not JSON.
                    unwrapped.append(number if np.isfinite(number) else None)
            except (TypeError, ValueError):
                continue
        if unwrapped:
            values_by_key[str(key)] = unwrapped
    return values_by_key


def _freq_labels(head):
    """measurement_frequency_label as a list of str; [] when absent."""
    raw = getattr(head, "measurement_frequency_label", None)
    if raw is None:
        # Older revisions of the fork spell it without the 'uency'.
        raw = getattr(head, "measurement_freq_label", None)
    if raw is None:
        return []
    values = raw.tolist() if hasattr(raw, "tolist") else list(raw)
    return [str(v) for v in values if v is not None]


def _dim_labels(head):
    """NdArrayHeader.dimension_labels as a list of str; [] when absent."""
    raw = getattr(head, "dimension_labels", None) or []
    return [name for name in (_enum_name(d) for d in raw) if name]


def _slug(text):
    """Lowercase, URL-safe fragment used in an array key."""
    out = []
    for ch in str(text).lower():
        out.append(ch if ch.isalnum() else "-")
    slug = "-".join(part for part in "".join(out).split("-") if part)
    return slug[:40] or "array"


def _describe_item(tag, value):
    """
    Classify one stream item.

    @return: (kind, name, dim_labels, labels, extra_key, meta) or None if the
             item carries no usable ndarray.
    """
    data = getattr(value, "data", None)
    if not isinstance(data, np.ndarray) or data.size == 0:
        return None

    head = getattr(value, "head", None)
    raw_meta = getattr(value, "meta", None) or getattr(head, "meta", None)
    meta_name = _meta_string(raw_meta)
    # Carried through rather than read here: xscale_ppm, peak_names,
    # peak_offsets_ppm, biggest_peak_index, biggest_peak_name and fit_loss are
    # what the fitted-spectrum and metabolite-map figures are drawn from, and
    # this is the only place they are in hand.
    meta = _meta_values(raw_meta)
    labels = _freq_labels(head)

    if tag.startswith("ndArray"):
        dim_labels = _dim_labels(head)
        array_type = _enum_name(getattr(head, "array_type", None))
        # An NdArray is an image when it is laid out over both spatial axes.
        is_image = "Y" in dim_labels and "X" in dim_labels
        name = meta_name or (_prettify(array_type) if array_type else "NdArray")
        return ("image" if is_image else "trace", name, dim_labels, labels,
                array_type, meta)

    if tag.startswith("waveform"):
        waveform_id = getattr(value, "waveform_id", None)
        name = meta_name or (f"Waveform {waveform_id}" if waveform_id is not None else "Waveform")
        return ("trace", name, ["CHANNEL", "SAMPLES"], labels, None, meta)

    if tag.startswith("image"):
        image_type = _enum_name(getattr(head, "image_type", None))
        # A 5-D image with real spatial extent is a picture; a degenerate one
        # (1x1 in-plane) is a spectrum sampled over the frequency axis.
        is_image = data.ndim == 5 and data.shape[2] > 1 and data.shape[3] > 1
        name = meta_name
        if not name:
            name = f"{_prettify(image_type)} image" if image_type else "Image"
            if labels:
                shown = ", ".join(labels[:3]) + ("…" if len(labels) > 3 else "")
                name = f"{name} ({shown})"
        dim_labels = list(_IMAGE_AXES) if data.ndim == 5 else []
        return ("image" if is_image else "trace", name, dim_labels, labels,
                image_type, meta)

    return None


def _to_image_6d(arr, dim_labels):
    """
    Reshape a stacked array into (channel, slice, rows, cols, frequency, measurement).

    @param arr: stacked array whose LAST axis is already the measurement axis
    @param dim_labels: labels of arr's leading axes, when known
    """
    base_ndim = arr.ndim - 1
    if len(dim_labels) == base_ndim and all(label in _IMAGE_AXES for label in dim_labels):
        # Reorder the axes we have into canonical order, then insert length-1
        # axes for the ones this array does not carry.
        present = [axis for axis in _IMAGE_AXES if axis in dim_labels]
        arr = np.transpose(arr, [dim_labels.index(axis) for axis in present] + [base_ndim])
        for position, axis in enumerate(_IMAGE_AXES):
            if axis not in present:
                arr = np.expand_dims(arr, axis=position)
        return arr

    # Unlabelled: assume the last two leading axes are the in-plane ones and
    # fold anything before them into the channel axis.
    base_shape = arr.shape[:-1]
    measurements = arr.shape[-1]
    if len(base_shape) < 2:
        # Not enough axes to be in-plane data; give it a 1-row image.
        return arr.reshape((1, 1, 1, int(np.prod(base_shape)) or 1, 1, measurements))
    rows, cols = base_shape[-2], base_shape[-1]
    channels = int(np.prod(base_shape[:-2])) if len(base_shape) > 2 else 1
    return arr.reshape((channels, 1, rows, cols, 1, measurements))


def _to_trace_3d(arr):
    """Reshape a stacked array into (series, samples, measurement)."""
    measurements = arr.shape[-1]
    base_shape = arr.shape[:-1]
    if not base_shape:
        return arr.reshape((1, 1, measurements))
    samples = base_shape[-1]
    series = int(np.prod(base_shape[:-1])) if len(base_shape) > 1 else 1
    return arr.reshape((series, samples, measurements))


def _walk_mrd_arrays(file_id):
    """
    Read an MRD file and group its stream items into named arrays.

    Items that agree on tag, type, labels and shape are stacked along a new
    trailing measurement axis — the same semantics the old image endpoint gave
    to repeated images. Shape is part of the grouping key on purpose: a file
    holding two same-tag streams of different shapes yields two arrays rather
    than silently interleaving them.

    @param file_id: file_id in mongodb of the mrd file
    @return: (arrays, unsupported) where arrays is a list of dicts carrying the
             descriptor fields plus 'data' (an ndarray), and unsupported is a
             list of {tag, count} for stream items that were skipped.
    """
    groups = OrderedDict()
    unsupported = OrderedDict()

    with mrd.BinaryMrdReader(io.BytesIO(_fetch_mrd_bytes(file_id))) as r:
        r.read_header()
        for item in r.read_data():
            tag = _item_tag(item)
            described = None if tag in _SKIP_TAGS else _describe_item(tag, item.value)
            if described is None:
                unsupported[tag] = unsupported.get(tag, 0) + 1
                continue

            kind, name, dim_labels, labels, extra_key, meta = described
            data = item.value.data
            group_key = (tag, kind, name, extra_key, tuple(dim_labels),
                         tuple(labels), tuple(data.shape))
            group = groups.get(group_key)
            if group is None:
                # The first item's meta stands for the group. A stacked array is
                # one array measured repeatedly, and what the figures read off
                # the meta -- the ppm axis, the peak pattern -- describes the
                # array, not the repetition.
                group = {"tag": tag, "kind": kind, "name": name, "labels": labels,
                         "dim_labels": dim_labels, "meta": meta, "chunks": []}
                groups[group_key] = group
            group["chunks"].append(data)

    arrays = []
    used_names = {}
    for ordinal, group in enumerate(groups.values()):
        stacked = np.stack(group["chunks"], axis=-1)
        transform = "none"
        if np.iscomplexobj(stacked):
            # JSON has no complex type; ship the magnitude and say so.
            dtype = str(stacked.dtype)
            stacked = np.abs(stacked)
            transform = "magnitude"
        else:
            dtype = str(stacked.dtype)

        if group["kind"] == "image":
            stacked = _to_image_6d(stacked, group["dim_labels"])
            dim_labels = list(_IMAGE_AXES) + ["MEASUREMENT"]
        else:
            stacked = _to_trace_3d(stacked)
            dim_labels = ["SERIES", "SAMPLES", "MEASUREMENT"]

        # Two arrays can legitimately share a name (same type, different shape);
        # disambiguate so the dropdown stays readable.
        name = group["name"]
        used_names[name] = used_names.get(name, 0) + 1
        if used_names[name] > 1:
            name = f"{name} #{used_names[name]}"

        arrays.append({
            "key": f"{ordinal}-{group['tag']}-{_slug(name)}",
            "name": name,
            "kind": group["kind"],
            "tag": group["tag"],
            "shape": list(stacked.shape),
            "dim_labels": dim_labels,
            "labels": group["labels"],
            "meta": group["meta"],
            "dtype": dtype,
            "transform": transform,
            "item_count": len(group["chunks"]),
            "data": stacked,
        })

    return arrays, [{"tag": tag, "count": count} for tag, count in unsupported.items()]


def list_mrd_arrays(file_id):
    """
    Describe every array the viewer can render from an MRD file, without
    returning any bulk data.

    @param file_id: file_id in mongodb of the mrd file
    @return: (descriptors, unsupported)
    """
    arrays, unsupported = _walk_mrd_arrays(file_id)
    return [{k: v for k, v in array.items() if k != "data"} for array in arrays], unsupported


def get_mrd_array(file_id, key):
    """
    Fetch a single named array as JSON-serializable nested lists.

    Values are returned unscaled — the old image endpoint multiplied everything
    by 255/max of the *first* image, which clipped later measurements and threw
    the units away. 'value_min'/'value_max' are supplied instead so callers can
    fix the colour scale themselves.

    @param file_id: file_id in mongodb of the mrd file
    @param key: array key from list_mrd_arrays
    @return: descriptor dict plus 'value_min', 'value_max' and 'data'
    @raise KeyError: if the file holds no array with that key
    """
    arrays, _ = _walk_mrd_arrays(file_id)
    for array in arrays:
        if array["key"] != key:
            continue
        data = array.pop("data")
        finite = data[np.isfinite(data)]
        array["value_min"] = float(finite.min()) if finite.size else 0.0
        array["value_max"] = float(finite.max()) if finite.size else 0.0
        # NaN/Inf would serialize to bare NaN/Infinity tokens, which JSON.parse
        # rejects; and rounding trims a meaningful slice off these payloads.
        array["data"] = np.round(np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0), 6).tolist()
        return array
    raise KeyError(key)


# ---------------------------------------------------------------------------
# k-space
#
# Acquisitions stay out of the array endpoints above: a raw file holds thousands
# and shipping k-space as JSON is not viable. What is viable is the reduction
# mrdplot.py::plot_kspace draws, which is the picture the science is actually
# read off. Every sample of an EPSI readout falls at one of `total` positions
# inside a gradient switch, so folding a readout on the switch count and summing
# over views and repetitions turns thousands of acquisitions into one
# nswitch x total image per encoding. The echo should sit on one column in every
# row; an echo that walks across the columns is the drift the shift stage takes
# out.
# ---------------------------------------------------------------------------

_NOISE_MEASUREMENT_FLAG = int(
    getattr(getattr(mrd, "AcquisitionFlags", None), "IS_NOISE_MEASUREMENT", 1 << 18)
)


def _header_nswitches(header):
    """The switch count the converter recorded, or 0 for a file with no EPSI readout."""
    parameters = getattr(header, "user_parameters", None)
    for item in getattr(parameters, "user_parameter_long", None) or []:
        if getattr(item, "name", None) == "nswitches":
            try:
                return int(item.value)
            except (TypeError, ValueError):
                return 0
    return 0


def _encoding_name(header, ref):
    """What to call an encoding space in the UI."""
    encodings = getattr(header, "encoding", None) or []
    if ref < len(encodings):
        description = getattr(encodings[ref], "trajectory_description", None)
        identifier = getattr(description, "identifier", None)
        if identifier:
            return str(identifier)
        trajectory = _enum_name(getattr(encodings[ref], "trajectory", None))
        if trajectory:
            return f"{_prettify(trajectory)} encoding {ref}"
    return f"encoding {ref}"


def _readout(acquisition):
    """The magnitude of an acquisition's first channel, or None."""
    data = np.asarray(getattr(acquisition, "data", None))
    if data.size == 0:
        return None
    return np.abs(data[0] if data.ndim > 1 else data)


class _SwitchFold:
    """
    One encoding's acquisitions, summed position-within-switch against switch.

    Held as a running sum rather than a list of readouts: the sum is the whole
    answer and a raw encoding is thousands of readouts wide.
    """

    def __init__(self, acquisition, nswitch):
        head = getattr(acquisition, "head", None)
        row = _readout(acquisition)
        self.samples = 0 if row is None else int(row.size)
        self.total = self.samples // nswitch
        self.discard_pre = int(getattr(head, "discard_pre", 0) or 0)
        self.discard_post = int(getattr(head, "discard_post", 0) or 0)
        # Decided on the first acquisition, as mrdplot does: the averaged
        # prescan calibrates a reconstruction rather than being reconstructed,
        # and its own drift says nothing about the series beside it.
        self.prescan = bool(int(getattr(head, "flags", 0) or 0)
                            & _NOISE_MEASUREMENT_FLAG)
        self.foldable = self.total >= 2 and not self.prescan
        self.signal = (np.zeros((nswitch, self.total), dtype=float)
                       if self.foldable else None)
        self.nswitch = nswitch
        self.summed = 0
        self.seen = 0

    def add(self, acquisition):
        self.seen += 1
        if not self.foldable:
            return
        row = _readout(acquisition)
        # An acquisition at another geometry belongs in no row of this image.
        if row is None or row.size != self.samples:
            return
        used = self.nswitch * self.total
        self.signal += row[:used].reshape(self.nswitch, self.total)
        self.summed += 1

    def summary(self, ref, name):
        kept = self.total - self.discard_pre - self.discard_post
        return {
            "ref": ref,
            "name": name,
            "total": self.total,
            "discard_pre": self.discard_pre,
            # what make_buffer keeps: whatever the two discards leave of the
            # switch, which is the readout axis the reconstruction transforms
            "kept": kept,
            # the echo belongs at the middle of the kept window, where k-space
            # crosses zero
            "echo": self.discard_pre + kept // 2 if kept > 0 else None,
            "signal": np.round(self.signal, 6).tolist(),
            "brightest": [int(column) for column in np.argmax(self.signal, axis=1)],
        }


def fold_kspace(nswitch, acquisitions, header=None):
    """
    Fold acquisitions on the gradient switch, one entry per encoding space.

    @param nswitch: the switch count the file's header records
    @param acquisitions: an iterable of Acquisition, in the order the file holds
                         them. mrdplot sorts by time stamp first; the sum does
                         not depend on the order, and the values that do come
                         from each encoding's first acquisition either way.
    @return: a list of encoding summaries; empty when nothing could be folded
    """
    if nswitch <= 1:
        return []

    folds = OrderedDict()
    for acquisition in acquisitions:
        head = getattr(acquisition, "head", None)
        ref = int(getattr(head, "encoding_space_ref", 0) or 0)
        fold = folds.get(ref)
        if fold is None:
            fold = folds[ref] = _SwitchFold(acquisition, nswitch)
        fold.add(acquisition)

    return [fold.summary(ref, _encoding_name(header, ref))
            for ref, fold in sorted(folds.items()) if fold.foldable]


def reduce_kspace(file_id):
    """
    The k-space of a stored file, folded on the gradient switch.

    @param file_id: file_id in mongodb of the mrd file
    @return: {'nswitch', 'encodings'}, or None when the file carries no EPSI
             readout to fold — which is how a spectral file looks.
    """
    with mrd.BinaryMrdReader(io.BytesIO(_fetch_mrd_bytes(file_id))) as reader:
        header = reader.read_header()
        nswitch = _header_nswitches(header)
        if nswitch <= 1:
            return None

        acquisitions = (item.value for item in reader.read_data()
                        if _item_tag(item) == "acquisition")
        encodings = fold_kspace(nswitch, acquisitions, header)

    if not encodings:
        return None
    return {"nswitch": nswitch, "encodings": encodings}


# ---------------------------------------------------------------------------
# Waveforms
#
# The pulse, gradient and acquisition time-series mrdplot's first figure draws.
# Decimated here rather than in the browser: a scan is minutes of samples and
# the point of the figure is the shape, not every sample of it.
#
# Pulses and gradients are read by stream tag, like everything else in this
# file, and the pinned revision of the MRD fork carries neither as a stream
# item. They come back empty for every file that revision can write, and start
# appearing the day the fork does, with nothing here to change.
# ---------------------------------------------------------------------------

_WAVEFORM_MAX_POINTS = 2000
_WAVEFORM_MAX_TRACES = 24

_NS = 1.0e-9


def _decimated(times, values, max_points):
    """One trace, thinned to at most max_points samples."""
    samples = int(len(values))
    stride = max(1, -(-samples // max_points))
    return {
        "t": [round(float(t), 9) for t in times[::stride]],
        "values": [round(float(v), 6) for v in values[::stride]],
        "samples": samples,
        "stride": stride,
    }


def _timeline(count, start_ns, step_ns, offset=0):
    """Sample times in seconds, from a start stamp and a sample interval."""
    return (np.arange(count) + offset) * (float(step_ns or 0) * _NS) + \
        float(start_ns or 0) * _NS


def _pulse_traces(pulse, index, max_points):
    amplitude = np.asarray(getattr(pulse, "amplitude", None))
    if amplitude.size == 0:
        return []
    head = getattr(pulse, "head", None)
    if amplitude.ndim == 1:
        amplitude = amplitude[np.newaxis, :]

    traces = []
    for channel in range(amplitude.shape[0]):
        # A zero either side, so a pulse reads as a shape on the line rather
        # than as a step out of nowhere.
        values = np.concatenate(([0.0], amplitude[channel], [0.0]))
        times = _timeline(values.size, getattr(head, "pulse_time_stamp_ns", 0),
                          getattr(head, "sample_time_ns", 0), offset=-1)
        traces.append({"name": f"pulse {index} channel {channel}",
                       **_decimated(times, values, max_points)})
    return traces


def _gradient_traces(gradient, index, max_points):
    head = getattr(gradient, "head", None)
    traces = []
    for axis in ("rl", "ap", "fh"):
        raw = getattr(gradient, axis, None)
        if raw is None:
            continue
        values = np.asarray(raw)
        if values.size == 0:
            continue
        times = _timeline(values.size, getattr(head, "gradient_time_stamp_ns", 0),
                          getattr(head, "gradient_sample_time_ns", 0))
        traces.append({"name": f"gradient {index} {axis}",
                       **_decimated(times, values, max_points)})
    return traces


def _acquisition_traces(acquisition, index, max_points):
    data = np.asarray(getattr(acquisition, "data", None))
    if data.size == 0:
        return []
    head = getattr(acquisition, "head", None)
    channel = data[0] if data.ndim > 1 else data
    times = _timeline(channel.size, getattr(head, "acquisition_time_stamp_ns", 0),
                      getattr(head, "sample_time_ns", 0))
    return [
        {"name": f"acquisition {index} real",
         **_decimated(times, np.real(channel), max_points)},
        {"name": f"acquisition {index} imaginary",
         **_decimated(times, np.imag(channel), max_points)},
    ]


# Which stream items become which group of traces. A table rather than a chain
# of ifs, because the only thing that differs per group is how one item turns
# into traces.
_WAVEFORM_GROUPS = (
    ("pulses", lambda tag: tag.startswith("pulse"), _pulse_traces),
    ("gradients", lambda tag: tag.startswith("gradient"), _gradient_traces),
    ("acquisitions", lambda tag: tag == "acquisition", _acquisition_traces),
)


def collect_waveforms(items, max_points=_WAVEFORM_MAX_POINTS,
                      max_traces=_WAVEFORM_MAX_TRACES):
    """
    Turn a stream into decimated time-series, grouped by what drew them.

    @param items: an iterable of (tag, value) stream items
    @return: {'pulses', 'gradients', 'acquisitions', 'decimation'} where each
             trace is {name, t, values, samples, stride} and 'decimation' says
             what was thinned and what was left out
    """
    traces = {group: [] for group, _matches, _build in _WAVEFORM_GROUPS}
    seen = {group: 0 for group in traces}

    for tag, value in items:
        for group, matches, build in _WAVEFORM_GROUPS:
            if not matches(tag):
                continue
            index = seen[group]
            seen[group] += 1
            if index < max_traces:
                traces[group].extend(build(value, index, max_points))
            break

    return {
        **traces,
        "decimation": {
            "max_points_per_trace": max_points,
            "max_items_per_group": max_traces,
            "items_omitted": {group: max(0, count - max_traces)
                              for group, count in seen.items()},
        },
    }


def waveform_traces(file_id, max_points=_WAVEFORM_MAX_POINTS,
                    max_traces=_WAVEFORM_MAX_TRACES):
    """
    The pulse, gradient and acquisition time-series a stored file carries.

    @param file_id: file_id in mongodb of the mrd file
    @return: the shape collect_waveforms describes
    """
    with mrd.BinaryMrdReader(io.BytesIO(_fetch_mrd_bytes(file_id))) as reader:
        reader.read_header()
        items = ((_item_tag(item), item.value) for item in reader.read_data())
        return collect_waveforms(items, max_points, max_traces)
