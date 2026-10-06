'''
mongoDB CRUD operation using application context of flask
'''
import logging
from flask import current_app
from bson import ObjectId
from bson.errors import InvalidId
from botocore.exceptions import ClientError
from pymongo.errors import PyMongoError
from collections import OrderedDict
from datetime import datetime
import os
import threading
import boto3
import numpy as np
from typing import Union, List, Optional
import io

import app.external.python.mrd as mrd

logger = logging.getLogger(__name__)

_INDEXES = {
    "groups": [
        (["name"], {"unique": True}),
        (["members"], {}),
        (["createdBy"], {}),
    ],
    "mrdfiles": [
        (["ownerId"], {}),
        (["groupName"], {}),
        ([("groupName", 1), ("studyDate", -1), ("studyTime", -1)], {}),
    ],
}


def ensure_indexes(db):
    """
    Create the indexes the routes rely on. create_index is a no-op when the
    index exists, so this runs on every start; groups.name's uniqueness is
    what makes POST /groups' 409 hold under concurrent creates.
    """
    for collection, indexes in _INDEXES.items():
        for keys, options in indexes:
            try:
                db[collection].create_index(keys, **options)
            except PyMongoError:
                logger.exception("could not create index %s on %s", keys, collection)


def get_db(db_name=None):
    """
    Returns the MongoDB database instance from the current application context.

    No connectivity check here. It used to ping Atlas on every call, and every
    function in this module calls get_db() independently, so one request paid
    several extra round trips; PyMongo already monitors and reconnects in the
    background. It also re-raised any failure as a bare Exception, which hid
    PyMongoError from the error handler and turned outages into generic 500s.

    @param db_name: override the configured database; defaults to MONGO_DB_NAME
    """
    return current_app.mongo_client.get_database(
        db_name or current_app.config['MONGO_DB_NAME']
    )


_S3_CLIENT = None


def get_s3_client():
    """
    Process-wide S3 client. Building one resolves credentials and loads service
    models, which belongs once per process rather than once per request.
    """
    global _S3_CLIENT
    if _S3_CLIENT is None:
        _S3_CLIENT = boto3.client("s3")
    return _S3_CLIENT


def _get_mrd_object(file_id):
    """
    Fetch mrd_files/{file_id} from the configured bucket.

    A missing object becomes FileNotFoundError (a 404 through the error
    handler) rather than a ClientError, which would read as a storage outage.
    """
    try:
        return get_s3_client().get_object(
            Bucket=current_app.config['S3_BUCKET'],
            Key=f'mrd_files/{file_id}',
        )
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            raise FileNotFoundError(file_id) from e
        raise

def list_all_mrdfiles(projection=None):
    """
    Retrieve list of mrd header from db sorted by studyDate in descending order
    DEPRECATED: Use list_mrdfiles_for_user instead for proper access control

    Database failures propagate (503 through the error handler). This used to
    catch everything and return [], so an outage rendered as "you have no files".
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

def get_user_group_names(user_sub: str) -> List[str]:
    """
    Get list of group names that a user belongs to
    Always includes 'public' group for backwards compatibility
    """
    try:
        db = get_db()
        cursor = db.groups.find(
            {"members": user_sub},
            {"name": 1, "_id": 0}
        )
        user_groups = [doc["name"] for doc in cursor]
        
        # Always include 'public' group for backwards compatibility
        if "public" not in user_groups:
            user_groups.append("public")
            
        return user_groups
    except Exception:  # pylint: disable=broad-exception-caught
        # Fail closed: on error the user sees public data only. Kept broad on
        # purpose -- this narrows access, it never widens it.
        logger.exception("could not load groups for %s; falling back to public", user_sub)
        return ["public"]

def list_mrdfiles_for_user(user_sub: Optional[str], projection=None, limit=50, skip=0):
    """
    Retrieve MRD files a caller may see. "public" is a group everyone is in, so
    a guest (user_sub None) sees the public group; a signed-in user also sees
    their private files, their groups' files and legacy (untagged) files.

    Database failures propagate (503) rather than returning [], which rendered an
    outage as an empty file list.
    """
    db = get_db()

    if user_sub is None:
        query = {"groupName": "public"}
    else:
        # get_user_group_names always includes "public"
        groupname_scope = get_user_group_names(user_sub)
        query = {
            "$or": [
                {"ownerId": user_sub},  # User's private files
                {"groupName": {"$in": groupname_scope}},  # Files in user's groups
                {"$and": [
                    {"$or": [{"ownerId": {"$exists": False}}, {"ownerId": None}]},  # No ownerId
                    {"$or": [{"groupName": {"$exists": False}}, {"groupName": None}]}  # No groupName
                ]}  # Legacy files (public to all)
            ]
        }

    sort_condition = {"studyDate": -1, "studyTime": -1}
    cursor = db.mrdfiles.find(query, projection).sort(sort_condition).skip(skip).limit(limit)

    cursor_list = list(cursor)
    for doc in cursor_list:
        doc['_id'] = str(doc['_id'])
    return cursor_list

def get_mrdfile_by_id(file_id):
    """
    Retrieve mrdfile db entry by its ObjectId.
    DEPRECATED: Use get_mrdfile_by_id_with_auth instead for proper access control
    """
    db = get_db()
    return db.mrdfiles.find_one({"_id": ObjectId(file_id)})

def get_mrdfile_by_id_with_auth(file_id: str, user_sub: str):
    """
    Retrieve mrdfile db entry by its ObjectId with access control
    Returns file if user has access, None otherwise

    A malformed id is "not found". A database failure propagates (503) -- it used
    to return None too, so an outage looked like "not found or no access".
    """
    db = get_db()
    try:
        file_doc = db.mrdfiles.find_one({"_id": ObjectId(file_id)})
    except (InvalidId, TypeError):
        return None

    if not file_doc:
        return None

    # Check access: user owns file OR file is in user's group OR file is public (untagged)
    if file_doc.get("ownerId") == user_sub:
        return file_doc

    # Check if file is in user's groups
    user_groups = get_user_group_names(user_sub)
    if file_doc.get("groupName") in user_groups:
        return file_doc

    # Check if file is public (legacy files without both ownerId AND groupName)
    owner_id = file_doc.get("ownerId")
    group_name = file_doc.get("groupName")
    if ((owner_id is None or owner_id == "") and (group_name is None or group_name == "")):
        return file_doc

    return None

def get_public_mrdfile_by_id(file_id: str):
    """
    Retrieve a file only if groupName='public'. For unauthenticated viewer access.
    Returns None if the file doesn't exist, is not public, or the id is malformed.
    Database failures propagate (503).
    """
    try:
        object_id = ObjectId(file_id)
    except (InvalidId, TypeError):
        return None
    return get_db().mrdfiles.find_one({"_id": object_id, "groupName": "public"})

def delete_mrdfiles_by_ids(file_ids):
    """
    Deletes multiple mrdfile db entries based on a list of ObjectIds.
    """
    db = get_db()
    # Convert string ids to ObjectId
    object_ids = [ObjectId(id) for id in file_ids]
    result = db.mrdfiles.delete_many({"_id": {"$in": object_ids}})
    return result.deleted_count

# What an unparseable file's document records as parse_error. The exception
# itself goes to the log: its text can carry paths and library internals, and
# GET /mrd-files/<id> returns the document as stored.
PARSE_ERROR_MESSAGE = "The file could not be read as an MRD stream."


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
                "groupName": None,  # Set by the upload route
                "ownerId": None,    # Set by the upload route
                "isReconstructed": image_exist,
                "protocolName": h.measurement_information.protocol_name,
                "measurementId": h.measurement_information.measurement_id,
                "stationName": h.acquisition_system_information.station_name,
                "original_filename": original_filename,
                "upload_timestamp": datetime.utcnow(),
                "file_size": file_size
            }
        return header_for_db
    except Exception:  # pylint: disable=broad-except
        # Not a failure path: an unparseable file is still stored, with basic
        # metadata and a fixed parse_error. The traceback goes to the log only.
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
            "groupName": None,  # Set by the upload route
            "ownerId": None,    # Set by the upload route
            "isReconstructed": False,
            "protocolName": "unknown",
            "measurementId": os.path.splitext(filename)[0],
            "stationName": "unknown",
            "original_filename": filename,
            "upload_timestamp": datetime.utcnow(),
            "file_size": file_size,
            "parse_error": PARSE_ERROR_MESSAGE
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

# Total bytes the MRD cache may hold per process. Uploads go up to 2 GiB, so a
# count bound would let one worker hold several whole files; an object larger
# than this is never cached.
MRD_BYTES_CACHE_MAX_BYTES = 256 * 1024 * 1024


class _BytesLRU:
    """Thread-safe LRU of bytes values, bounded by their total size."""

    def __init__(self, max_bytes):
        self.max_bytes = max_bytes
        self._items = OrderedDict()
        self._total = 0
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            value = self._items.get(key)
            if value is not None:
                self._items.move_to_end(key)
            return value

    def put(self, key, value):
        size = len(value)
        if size > self.max_bytes:
            return
        with self._lock:
            old = self._items.pop(key, None)
            if old is not None:
                self._total -= len(old)
            self._items[key] = value
            self._total += size
            while self._total > self.max_bytes:
                _, evicted = self._items.popitem(last=False)
                self._total -= len(evicted)

    def clear(self):
        with self._lock:
            self._items.clear()
            self._total = 0

    @property
    def total_bytes(self):
        with self._lock:
            return self._total

    def __contains__(self, key):
        with self._lock:
            return key in self._items


# Downloaded MRD bytes, keyed by file_id. Listing a file's arrays and then
# fetching one of them would otherwise download the same object twice. Objects
# are immutable for a given ObjectId key, so entries never go stale. This is a
# per-process cache; each gunicorn worker holds its own.
_MRD_BYTES_CACHE = _BytesLRU(MRD_BYTES_CACHE_MAX_BYTES)

# Stream items that are never offered as arrays. Acquisitions are excluded
# deliberately: a raw file holds thousands of them and shipping k-space as JSON
# is not viable.
_SKIP_TAGS = frozenset({"acquisition", "acquisitionBucket", "reconData", "imageArray"})

# Meta keys checked, in order, for a human-readable array name.
_META_NAME_KEYS = ("name", "array_name", "label", "title", "description", "imagecomments")

# Canonical axis order of a `kind="image"` array, before the trailing
# measurement axis appended by stacking.
_IMAGE_AXES = ("CHANNEL", "Z", "Y", "X", "FREQUENCY")


class MrdContentError(ValueError):
    """The stored object could not be parsed as an MRD stream."""


class UnknownArrayKey(KeyError):
    """The file holds no array with the requested key."""


def _fetch_mrd_bytes(file_id):
    """
    Download mrd_files/{file_id} from S3, with an in-process LRU bounded by
    MRD_BYTES_CACHE_MAX_BYTES.

    @param file_id: file_id in mongodb of the mrd file
    @return: the raw object bytes
    @raise FileNotFoundError: if no such object exists in the bucket
    """
    cached = _MRD_BYTES_CACHE.get(file_id)
    if cached is not None:
        return cached

    # Downloaded outside the lock; two concurrent misses may both fetch.
    body_bytes = _get_mrd_object(file_id)['Body'].read()
    _MRD_BYTES_CACHE.put(file_id, body_bytes)
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

    body_bytes = _fetch_mrd_bytes(file_id)
    try:
        with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as r:
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
                    # The first item's meta stands for the group. A stacked
                    # array is one array measured repeatedly, and what the
                    # figures read off the meta -- the ppm axis, the peak
                    # pattern -- describes the array, not the repetition.
                    group = {"tag": tag, "kind": kind, "name": name, "labels": labels,
                             "dim_labels": dim_labels, "meta": meta, "chunks": []}
                    groups[group_key] = group
                group["chunks"].append(data)
    except (RuntimeError, EOFError, ValueError) as exc:
        # The MRD reader signals bad magic, a schema mismatch or truncation
        # with these; all mean the stored object is not a readable MRD stream.
        raise MrdContentError(file_id) from exc

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
    @raise UnknownArrayKey: if the file holds no array with that key
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
    raise UnknownArrayKey(key)


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
    @raise MrdContentError: the stored object is not a readable MRD stream
    """
    body_bytes = _fetch_mrd_bytes(file_id)
    try:
        with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as reader:
            header = reader.read_header()
            nswitch = _header_nswitches(header)
            acquisitions = (item.value for item in reader.read_data()
                            if _item_tag(item) == "acquisition")
            # The stream is read to the end either way: the reader refuses to
            # close on a stream it has not finished.
            encodings = fold_kspace(nswitch, acquisitions, header) if nswitch > 1 else []
            for _ in acquisitions:
                pass
    except (RuntimeError, EOFError, ValueError) as exc:
        raise MrdContentError(file_id) from exc

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
    @raise MrdContentError: the stored object is not a readable MRD stream
    """
    body_bytes = _fetch_mrd_bytes(file_id)
    try:
        with mrd.BinaryMrdReader(io.BytesIO(body_bytes)) as reader:
            reader.read_header()
            items = ((_item_tag(item), item.value) for item in reader.read_data())
            return collect_waveforms(items, max_points, max_traces)
    except (RuntimeError, EOFError, ValueError) as exc:
        raise MrdContentError(file_id) from exc


# Group management functions

def create_group(name: str, display_name: str, description: str, creator_sub: str) -> ObjectId:
    """
    Create a new group with the creator as admin and first member
    """
    try:
        db = get_db()
        group_doc = {
            "name": name,
            "displayName": display_name,
            "description": description,
            "createdAt": datetime.utcnow(),
            "createdBy": creator_sub,
            "members": [creator_sub],
            "admins": [creator_sub],
            "properties": {}
        }
        result = db.groups.insert_one(group_doc)
        return result.inserted_id
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error creating group")
        raise

def get_user_groups(user_sub: str) -> List[dict]:
    """
    Get all groups that a user belongs to with full details
    """
    try:
        db = get_db()
        cursor = db.groups.find({"members": user_sub})
        groups = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            groups.append(doc)
        return groups
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error getting user groups")
        return []

def get_group_by_name(group_name: str) -> Optional[dict]:
    """
    Get group details by name
    """
    try:
        db = get_db()
        group = db.groups.find_one({"name": group_name})
        if group:
            group['_id'] = str(group['_id'])
        return group
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error getting group")
        return None

def is_group_admin(group_name: str, user_sub: str) -> bool:
    """
    Check if user is admin of the group
    """
    try:
        db = get_db()
        logger.debug(f"is_group_admin checking group={group_name}, user_sub={user_sub}")
        
        group = db.groups.find_one(
            {"name": group_name, "admins": user_sub},
            {"_id": 1}
        )
        
        logger.debug(f"is_group_admin found group: {group is not None}")
        if group:
            logger.debug(f"Group found with _id: {group.get('_id')}")
        
        return group is not None
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error checking group admin")
        return False

def is_group_member(group_name: str, user_sub: str) -> bool:
    """
    Check if user is member of the group
    """
    try:
        db = get_db()
        group = db.groups.find_one(
            {"name": group_name, "members": user_sub},
            {"_id": 1}
        )
        return group is not None
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error checking group member")
        return False

def add_group_member(group_name: str, user_sub: str, added_by_sub: str) -> bool:
    """
    Add user to group. Any member can invite, but only admins can add without invitation
    """
    try:
        db = get_db()
        
        # Check if the person adding is a member
        if not is_group_member(group_name, added_by_sub):
            return False
        
        # Add member to group
        result = db.groups.update_one(
            {"name": group_name},
            {"$addToSet": {"members": user_sub}}
        )
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error adding group member")
        return False

def remove_group_member(group_name: str, user_sub: str, removed_by_sub: str) -> bool:
    """
    Remove user from group. Only admins can remove members, or users can remove themselves
    """
    try:
        db = get_db()
        
        # Check if the person removing is admin or removing themselves
        if not (is_group_admin(group_name, removed_by_sub) or user_sub == removed_by_sub):
            return False
        
        # Don't allow removing the last admin
        group = get_group_by_name(group_name)
        if group and len(group.get("admins", [])) == 1 and user_sub in group.get("admins", []):
            return False
        
        # Remove from members and admins
        result = db.groups.update_one(
            {"name": group_name},
            {"$pull": {"members": user_sub, "admins": user_sub}}
        )
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error removing group member")
        return False

def promote_to_admin(group_name: str, user_sub: str, promoted_by_sub: str) -> bool:
    """
    Promote user to admin. Only admins can promote
    """
    try:
        if not is_group_admin(group_name, promoted_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name, "members": user_sub},
            {"$addToSet": {"admins": user_sub}}
        )
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error promoting to admin")
        return False

def demote_admin(group_name: str, user_sub: str, demoted_by_sub: str) -> bool:
    """
    Demote admin to regular member. Only admins can demote, can't demote yourself
    """
    try:
        if not is_group_admin(group_name, demoted_by_sub) or user_sub == demoted_by_sub:
            return False
        
        # Don't allow demoting the last admin
        group = get_group_by_name(group_name)
        if group and len(group.get("admins", [])) == 1:
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$pull": {"admins": user_sub}}
        )
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error demoting admin")
        return False

def update_group_properties(group_name: str, updates: dict, updated_by_sub: str) -> bool:
    """
    Update group properties. Only admins can update
    """
    try:
        if not is_group_admin(group_name, updated_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$set": updates}
        )
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error updating group properties")
        return False

def delete_group(group_name: str, deleted_by_sub: str) -> bool:
    """
    Delete group. Only admins can delete, and group must be empty of files
    """
    try:
        if not is_group_admin(group_name, deleted_by_sub):
            return False
        
        # Check if group has any files
        db = get_db()
        file_count = db.mrdfiles.count_documents({"groupName": group_name})
        if file_count > 0:
            return False
        
        # Delete the group
        result = db.groups.delete_one({"name": group_name})
        return result.deleted_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error deleting group")
        return False

# ===== INVITE CODE FUNCTIONS =====

def generate_invite_code(group_name: str, created_by_sub: str, expires_days: int = None, max_uses: int = None) -> str:
    """
    Generate a new invite code for a group
    Returns the generated code
    """
    try:
        if not is_group_admin(group_name, created_by_sub):
            return None
        
        import secrets
        import string
        from datetime import datetime, timedelta
        
        # Generate secure random code (9 characters, alphanumeric)
        alphabet = string.ascii_uppercase + string.digits
        code = ''.join(secrets.choice(alphabet) for _ in range(9))
        
        # Calculate expiration date
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
        
        # Create invite code object
        invite_code = {
            "code": code,
            "createdBy": created_by_sub,
            "createdAt": datetime.utcnow(),
            "expiresAt": expires_at,
            "maxUses": max_uses,
            "usedCount": 0
        }
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$push": {"inviteCodes": invite_code}}
        )
        
        return code if result.modified_count > 0 else None
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error generating invite code")
        return None

def validate_invite_code(code: str) -> dict:
    """
    Validate an invite code
    Returns group info if valid, None if invalid
    """
    try:
        db = get_db()
        group = db.groups.find_one(
            {"inviteCodes.code": code},
            {"name": 1, "displayName": 1, "inviteCodes.$": 1}
        )
        
        if not group:
            return None
        
        invite_code = group["inviteCodes"][0]
        now = datetime.utcnow()
        
        # Check expiration
        if invite_code.get("expiresAt") and invite_code["expiresAt"] < now:
            return None
        
        # Check max uses
        if invite_code.get("maxUses") and invite_code["usedCount"] >= invite_code["maxUses"]:
            return None
        
        return {
            "groupName": group["name"],
            "displayName": group["displayName"],
            "code": code
        }
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error validating invite code")
        return None

def use_invite_code(code: str, user_sub: str) -> dict:
    """
    Use an invite code to join a group
    Returns group info if successful, None if failed
    """
    try:
        # First validate the code
        code_info = validate_invite_code(code)
        if not code_info:
            return None
        
        group_name = code_info["groupName"]
        
        # Check if user is already a member
        if is_group_member(group_name, user_sub):
            return None
        
        db = get_db()
        
        # Add user to group and increment usage count
        result = db.groups.update_one(
            {
                "name": group_name,
                "inviteCodes.code": code
            },
            {
                "$addToSet": {"members": user_sub},
                "$inc": {"inviteCodes.$.usedCount": 1}
            }
        )
        
        if result.modified_count > 0:
            return code_info
        return None
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error using invite code")
        return None

def get_group_invite_codes(group_name: str, user_sub: str) -> list:
    """
    Get all invite codes for a group (admin only)
    """
    try:
        if not is_group_admin(group_name, user_sub):
            return []
        
        db = get_db()
        group = db.groups.find_one(
            {"name": group_name},
            {"inviteCodes": 1}
        )
        
        return group.get("inviteCodes", []) if group else []
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error getting invite codes")
        return []

def revoke_invite_code(group_name: str, code: str, user_sub: str) -> bool:
    """
    Revoke an invite code (admin only)
    """
    try:
        if not is_group_admin(group_name, user_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$pull": {"inviteCodes": {"code": code}}}
        )
        
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error revoking invite code")
        return False

# ===== JOIN REQUEST FUNCTIONS =====

def create_join_request(group_name: str, user_sub: str, user_name: str, user_email: str) -> bool:
    """
    Create a join request for a group
    """
    try:
        logger.debug(f"create_join_request called with group_name={group_name}, user_sub={user_sub}")
        
        # Check if user is already a member
        if is_group_member(group_name, user_sub):
            logger.debug(f"User {user_sub} is already a member of {group_name}")
            return False
        
        # Check if group exists and is discoverable
        group = get_group_by_name(group_name)
        if not group or not group.get("settings", {}).get("isDiscoverable", True):
            logger.debug(f"Group {group_name} not found or not discoverable")
            return False
        
        # Check if there's already a pending request
        db = get_db()
        existing_request = db.groups.find_one(
            {
                "name": group_name,
                "joinRequests": {
                    "$elemMatch": {
                        "userSub": user_sub,
                        "status": "pending"
                    }
                }
            }
        )
        
        if existing_request:
            logger.debug(f"User {user_sub} already has a pending request for {group_name}")
            return False
        
        # Create join request
        join_request = {
            "userSub": user_sub,
            "userName": user_name,
            "userEmail": user_email,
            "requestedAt": datetime.utcnow(),
            "status": "pending"
        }
        
        # Check if group has auto-approve enabled
        auto_approve = group.get("settings", {}).get("autoApprove", False)
        
        logger.debug(f"Auto-approve enabled: {auto_approve}")
        
        if auto_approve:
            # Auto-approve: add user to members and mark request as approved
            result = db.groups.update_one(
                {"name": group_name},
                {
                    "$addToSet": {"members": user_sub},
                    "$push": {"joinRequests": {**join_request, "status": "approved"}}
                }
            )
        else:
            # Manual approval: just add the request
            result = db.groups.update_one(
                {"name": group_name},
                {"$push": {"joinRequests": join_request}}
            )
        
        logger.debug(f"Database update result: {result.modified_count > 0}")
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error creating join request")
        return False

def get_pending_join_requests(group_name: str, user_sub: str) -> list:
    """
    Get pending join requests for a group (admin only)
    """
    try:
        if not is_group_admin(group_name, user_sub):
            return []
        
        db = get_db()
        group = db.groups.find_one(
            {"name": group_name},
            {"joinRequests": 1}
        )
        
        if not group:
            return []
        
        # Filter for pending requests
        pending_requests = [
            req for req in group.get("joinRequests", [])
            if req.get("status") == "pending"
        ]
        
        return pending_requests
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error getting pending join requests")
        return []

def approve_join_request(group_name: str, user_sub: str, approved_by_sub: str) -> bool:
    """
    Approve a join request (admin only)
    """
    try:
        if not is_group_admin(group_name, approved_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {
                "name": group_name,
                "joinRequests": {
                    "$elemMatch": {
                        "userSub": user_sub,
                        "status": "pending"
                    }
                }
            },
            {
                "$addToSet": {"members": user_sub},
                "$set": {"joinRequests.$.status": "approved"}
            }
        )
        
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error approving join request")
        return False

def deny_join_request(group_name: str, user_sub: str, denied_by_sub: str) -> bool:
    """
    Deny a join request (admin only)
    """
    try:
        if not is_group_admin(group_name, denied_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {
                "name": group_name,
                "joinRequests": {
                    "$elemMatch": {
                        "userSub": user_sub,
                        "status": "pending"
                    }
                }
            },
            {"$set": {"joinRequests.$.status": "denied"}}
        )
        
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error denying join request")
        return False

# ===== GROUP SEARCH FUNCTIONS =====

def search_groups(query: str, user_sub: str) -> list:
    """
    Search for discoverable groups that the user is not already a member of
    """
    try:
        db = get_db()
        
        # Get groups user is already a member of
        user_groups = get_user_group_names(user_sub)
        
        # Build search query
        search_filter = {
            "settings.isDiscoverable": True,
            "name": {"$nin": user_groups}  # Exclude groups user is already in
        }
        
        if query and query.strip():
            # Add text search if query provided
            search_filter["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"displayName": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}}
            ]
        
        # Get discoverable groups
        groups = list(db.groups.find(
            search_filter,
            {
                "name": 1,
                "displayName": 1,
                "description": 1,
                "members": 1,
                "createdAt": 1
            }
        ).limit(20))
        
        # Add member count to each group
        for group in groups:
            group["memberCount"] = len(group.get("members", []))
            group["_id"] = str(group["_id"])
        
        return groups
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error searching groups")
        return []

def get_group_settings(group_name: str) -> dict:
    """
    Get group settings
    """
    try:
        group = get_group_by_name(group_name)
        if not group:
            return None
        
        return group.get("settings", {
            "isDiscoverable": True,
            "autoApprove": False
        })
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error getting group settings")
        return None

def update_group_settings(group_name: str, settings: dict, updated_by_sub: str) -> bool:
    """
    Update group settings (admin only)
    """
    try:
        if not is_group_admin(group_name, updated_by_sub):
            return False
        
        db = get_db()
        result = db.groups.update_one(
            {"name": group_name},
            {"$set": {"settings": settings}}
        )
        
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error updating group settings")
        return False

def get_user_join_requests(user_sub: str) -> list:
    """
    Get all join requests made by a user across all groups
    """
    try:
        db = get_db()
        
        # Find all groups where this user has made join requests
        groups = list(db.groups.find(
            {"joinRequests.userSub": user_sub},
            {"name": 1, "displayName": 1, "joinRequests": 1}
        ))
        
        user_requests = []
        for group in groups:
            # Find the user's requests in this group
            for request in group.get("joinRequests", []):
                if request.get("userSub") == user_sub:
                    user_requests.append({
                        "groupName": group["name"],
                        "displayName": group["displayName"],
                        "status": request.get("status", "pending"),
                        "requestedAt": request.get("requestedAt"),
                        "userName": request.get("userName"),
                        "userEmail": request.get("userEmail")
                    })
        
        # Sort by requested date (most recent first)
        user_requests.sort(key=lambda x: x.get("requestedAt", ""), reverse=True)
        
        return user_requests
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error getting user join requests")
        return []

def withdraw_join_request(group_name: str, user_sub: str) -> bool:
    """
    Withdraw a pending join request
    """
    try:
        db = get_db()
        
        # Remove the pending request from the group
        result = db.groups.update_one(
            {
                "name": group_name,
                "joinRequests": {
                    "$elemMatch": {
                        "userSub": user_sub,
                        "status": "pending"
                    }
                }
            },
            {
                "$pull": {
                    "joinRequests": {
                        "userSub": user_sub,
                        "status": "pending"
                    }
                }
            }
        )
        
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error withdrawing join request")
        return False

def change_file_visibility(file_id: str, new_group_name: Optional[str], user_sub: str) -> bool:
    """
    Change file from private to group or vice versa. Only file owner can change
    """
    try:
        db = get_db()
        
        # Check if user owns the file
        file_doc = db.mrdfiles.find_one({"_id": ObjectId(file_id)})
        if not file_doc or file_doc.get("ownerId") != user_sub:
            return False
        
        # If moving to a group, check if user is member of that group
        if new_group_name and not is_group_member(new_group_name, user_sub):
            return False
        
        # Update the file
        result = db.mrdfiles.update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {"groupName": new_group_name}}
        )
        return result.modified_count > 0
    except Exception:  # pylint: disable=broad-exception-caught
        logger.exception("Error changing file visibility")
        return False
