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

    @return: (kind, name, dim_labels, labels, extra_key) or None if the item
             carries no usable ndarray.
    """
    data = getattr(value, "data", None)
    if not isinstance(data, np.ndarray) or data.size == 0:
        return None

    head = getattr(value, "head", None)
    meta_name = _meta_string(getattr(value, "meta", None) or getattr(head, "meta", None))
    labels = _freq_labels(head)

    if tag.startswith("ndArray"):
        dim_labels = _dim_labels(head)
        array_type = _enum_name(getattr(head, "array_type", None))
        # An NdArray is an image when it is laid out over both spatial axes.
        is_image = "Y" in dim_labels and "X" in dim_labels
        name = meta_name or (_prettify(array_type) if array_type else "NdArray")
        return ("image" if is_image else "trace", name, dim_labels, labels, array_type)

    if tag.startswith("waveform"):
        waveform_id = getattr(value, "waveform_id", None)
        name = meta_name or (f"Waveform {waveform_id}" if waveform_id is not None else "Waveform")
        return ("trace", name, ["CHANNEL", "SAMPLES"], labels, None)

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
        return ("image" if is_image else "trace", name, dim_labels, labels, image_type)

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

            kind, name, dim_labels, labels, extra_key = described
            data = item.value.data
            group_key = (tag, kind, name, extra_key, tuple(dim_labels),
                         tuple(labels), tuple(data.shape))
            group = groups.get(group_key)
            if group is None:
                group = {"tag": tag, "kind": kind, "name": name, "labels": labels,
                         "dim_labels": dim_labels, "chunks": []}
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
