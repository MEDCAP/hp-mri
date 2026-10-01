"""
Access control and the write path, against a real MongoDB.

Everything else mocks the data layer, which cannot tell whether the $or query
behind "files this user may see" actually selects the right documents. These
tests do. They pin dev's rules as they stand:

  * a user sees their own private files,
  * files in any group they are a member of,
  * files in the "public" group,
  * and legacy files with neither ownerId nor groupName.

The viewer's figure routes and reconstruction follow the same read rule; a
reconstruction is private to whoever ran it, and a job is visible only to the
user who started it.

Run with a local server (skipped otherwise; CI always runs them):

    docker compose -f ../docker-compose.test.yml up -d
    MONGO_TEST_URI=mongodb://localhost:27017 pytest
"""
import io
from unittest import mock

import pytest
from botocore.exceptions import ClientError
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

import data

ALICE, BOB, CAROL = "sub-alice", "sub-bob", "sub-carol"


def seed(db_app):
    """
    alice-private  owned by Alice, no group
    team-file      owned by Alice, group team-a (Alice and Bob are members)
    public-file    owned by Carol, group public
    legacy-file    no owner, no group -- uploaded before groups existed
    """
    with db_app.app_context():
        db = data.get_db()
        db.groups.insert_one({"name": "team-a", "members": [ALICE, BOB], "admins": [ALICE]})
        ids = {}
        for name, doc in {
            "alice-private": {"ownerId": ALICE, "groupName": None},
            "team-file": {"ownerId": ALICE, "groupName": "team-a"},
            "public-file": {"ownerId": CAROL, "groupName": "public"},
            "legacy-file": {},
        }.items():
            ids[name] = db.mrdfiles.insert_one(
                {"fileName": name, "studyDate": "20260101", "studyTime": "000000",
                 "s3_key": f"mrd_files/{name}", **doc}
            ).inserted_id
        return ids


def visible_to(db_app, sub):
    with db_app.app_context():
        return {d["fileName"] for d in data.list_mrdfiles_for_user(sub)}


# --- who sees what ------------------------------------------------------------

@pytest.mark.parametrize("sub, expected", [
    (ALICE, {"alice-private", "team-file", "public-file", "legacy-file"}),
    (BOB, {"team-file", "public-file", "legacy-file"}),
    (CAROL, {"public-file", "legacy-file"}),
])
def test_listing_follows_ownership_groups_and_public(db_app, sub, expected):
    seed(db_app)
    assert visible_to(db_app, sub) == expected


def test_listing_never_shows_another_users_private_file(db_app):
    seed(db_app)
    assert "alice-private" not in visible_to(db_app, BOB)
    assert "alice-private" not in visible_to(db_app, CAROL)


@pytest.mark.parametrize("sub, name, allowed", [
    (ALICE, "alice-private", True),
    (BOB, "alice-private", False),
    (BOB, "team-file", True),
    (CAROL, "team-file", False),
    (CAROL, "public-file", True),
    (CAROL, "legacy-file", True),
])
def test_single_file_access_matches_the_listing(db_app, sub, name, allowed):
    ids = seed(db_app)
    with db_app.app_context():
        found = data.get_mrdfile_by_id_with_auth(str(ids[name]), sub)
    assert (found is not None) is allowed


def test_a_malformed_id_is_simply_not_found(db_app):
    seed(db_app)
    with db_app.app_context():
        assert data.get_mrdfile_by_id_with_auth("not-an-objectid", ALICE) is None
        assert data.get_public_mrdfile_by_id("not-an-objectid") is None


def test_guests_see_the_public_group_only(db_app):
    """Legacy files are visible to signed-in users, but not to guests."""
    ids = seed(db_app)
    with db_app.app_context():
        public = {d["fileName"] for d in data.list_mrdfiles_for_user(None)}
        assert public == {"public-file"}
        assert data.get_public_mrdfile_by_id(str(ids["legacy-file"])) is None
        assert data.get_public_mrdfile_by_id(str(ids["public-file"])) is not None


def test_the_file_list_route_scopes_guests_and_users(db_app, db_client, user):
    seed(db_app)
    guest = {d["fileName"] for d in db_client.get("/api/mrd-files").get_json()}
    alice = {d["fileName"] for d in db_client.get("/api/mrd-files", headers=user(ALICE)).get_json()}
    assert guest == {"public-file"}
    assert alice == {"alice-private", "team-file", "public-file", "legacy-file"}


def test_listing_is_newest_first_with_string_ids(db_app):
    with db_app.app_context():
        db = data.get_db()
        for day in ("20250101", "20260601", "20260101"):
            db.mrdfiles.insert_one({"fileName": day, "studyDate": day, "studyTime": "0", "ownerId": ALICE})
        rows = data.list_mrdfiles_for_user(ALICE)
    assert [r["fileName"] for r in rows] == ["20260601", "20260101", "20250101"]
    assert all(isinstance(r["_id"], str) for r in rows)


# --- changing things ----------------------------------------------------------

def test_only_the_owner_can_change_visibility(db_app):
    ids = seed(db_app)
    file_id = str(ids["team-file"])
    with db_app.app_context():
        assert data.change_file_visibility(file_id, None, BOB) is False
        assert data.change_file_visibility(file_id, None, ALICE) is True
        assert data.get_db().mrdfiles.find_one({"_id": ids["team-file"]})["groupName"] is None


def test_owner_cannot_move_a_file_into_a_group_they_are_not_in(db_app):
    ids = seed(db_app)
    with db_app.app_context():
        assert data.change_file_visibility(str(ids["alice-private"]), "some-other-team", ALICE) is False


def test_owner_can_delete_their_file_through_the_api(db_app, db_client, user):
    ids = seed(db_app)
    with mock.patch("app.mrds.routes.get_s3_client"):
        response = db_client.delete("/api/mrd-file", headers=user(ALICE),
                                    json={"ids": [str(ids["alice-private"])]})
    assert response.get_json()["deleted_count"] == 1
    assert "alice-private" not in visible_to(db_app, ALICE)


def test_a_stranger_cannot_delete_a_private_file(db_app, db_client, user):
    ids = seed(db_app)
    with mock.patch("app.mrds.routes.get_s3_client"):
        response = db_client.delete("/api/mrd-file", headers=user(CAROL),
                                    json={"ids": [str(ids["alice-private"])]})
    assert response.get_json()["deleted_count"] == 0
    assert "alice-private" in visible_to(db_app, ALICE)


@pytest.mark.xfail(strict=True, reason=(
    "KNOWN ISSUE: DELETE authorises with the read check, so any group member can "
    "delete another member's file (and any signed-in user can delete legacy "
    "files). change_file_visibility requires ownership; delete does not. Who may "
    "delete group files is a policy decision. When it is fixed this test starts "
    "passing, strict xfail turns that into a failure, and the marker must be "
    "removed deliberately."
))
def test_a_group_member_cannot_delete_another_members_file(db_app, db_client, user):
    ids = seed(db_app)
    with mock.patch("app.mrds.routes.get_s3_client"):
        db_client.delete("/api/mrd-file", headers=user(BOB), json={"ids": [str(ids["team-file"])]})
    assert "team-file" in visible_to(db_app, ALICE)


@pytest.mark.xfail(strict=True, reason=(
    "KNOWN ISSUE: legacy files (no ownerId, no groupName) pass the read check for "
    "every signed-in user, so any user can delete every pre-groups file. See the "
    "test above."
))
def test_any_user_cannot_delete_a_legacy_file(db_app, db_client, user):
    ids = seed(db_app)
    with mock.patch("app.mrds.routes.get_s3_client"):
        db_client.delete("/api/mrd-file", headers=user(CAROL), json={"ids": [str(ids["legacy-file"])]})
    assert "legacy-file" in visible_to(db_app, ALICE)


# --- the viewer ---------------------------------------------------------------

GUEST = None


def open_in_viewer(db_client, user, file_id, sub):
    """Status codes of listing a file's arrays, then fetching the first one."""
    headers = user(sub) if sub else {}
    listing = db_client.get(f"/api/viewer/{file_id}/arrays", headers=headers)
    key = "0-imageFloat-magnitude-image"
    array = db_client.get(f"/api/viewer/{file_id}/arrays/{key}", headers=headers)
    return listing.status_code, array.status_code


@pytest.mark.parametrize("sub, name, allowed", [
    (GUEST, "public-file", True),
    (GUEST, "alice-private", False),
    (GUEST, "team-file", False),
    (GUEST, "legacy-file", False),
    (ALICE, "alice-private", True),
    (BOB, "alice-private", False),
    (BOB, "team-file", True),
    (CAROL, "team-file", False),
    (CAROL, "public-file", True),
    (CAROL, "legacy-file", True),
])
def test_the_viewer_opens_exactly_the_files_the_caller_may_see(
        db_app, db_client, user, s3_object, sub, name, allowed):
    ids = seed(db_app)
    get_object = s3_object()
    statuses = open_in_viewer(db_client, user, str(ids[name]), sub)
    assert statuses == ((200, 200) if allowed else (404, 404))
    if not allowed:
        get_object.assert_not_called()


def test_a_guest_cannot_open_a_private_file_by_id(db_app, db_client, s3_object):
    ids = seed(db_app)
    s3_object()
    response = db_client.get(f"/api/viewer/{ids['alice-private']}/arrays")
    assert response.status_code == 404
    assert "alice" not in response.get_data(as_text=True)


# --- failure ------------------------------------------------------------------

def test_a_real_outage_is_503_not_an_empty_list(db_app, db_client, user):
    import pymongo  # pylint: disable=import-outside-toplevel

    broken = pymongo.MongoClient("mongodb://127.0.0.1:1/", serverSelectionTimeoutMS=50)
    try:
        with mock.patch.object(db_app, "mongo_client", broken):
            response = db_client.get("/api/mrd-files", headers=user(ALICE))
    finally:
        broken.close()
    assert response.status_code == 503


def test_insert_round_trips(db_app):
    with db_app.app_context():
        inserted = data.insert_mrdfile_header({"fileName": "x", "ownerId": ALICE})
        assert isinstance(inserted, ObjectId)
        assert data.get_mrdfile_by_id_with_auth(str(inserted), ALICE)["fileName"] == "x"


# --- k-space and waveforms --------------------------------------------------

@pytest.mark.parametrize("route", ["kspace", "waveforms"])
@pytest.mark.parametrize("sub, name, allowed", [
    (GUEST, "public-file", True),
    (GUEST, "alice-private", False),
    (GUEST, "legacy-file", False),
    (ALICE, "alice-private", True),
    (BOB, "alice-private", False),
    (BOB, "team-file", True),
    (CAROL, "team-file", False),
    (CAROL, "legacy-file", True),
])
def test_the_figure_routes_follow_the_viewers_rule(
        db_app, db_client, user, s3_object, route, sub, name, allowed):
    ids = seed(db_app)
    get_object = s3_object()
    headers = user(sub) if sub else {}
    response = db_client.get(f"/api/viewer/{ids[name]}/{route}", headers=headers)
    if allowed:
        # The seeded stream has no EPSI readout, so k-space is its own 404; what
        # matters is that the object was read.
        assert response.status_code == (404 if route == "kspace" else 200)
        get_object.assert_called()
    else:
        assert response.status_code == 404
        get_object.assert_not_called()


# --- reconstruction, conversion and jobs ------------------------------------

STAGES = [{"id": "shift"}]


def jobs_in(db_app):
    with db_app.app_context():
        return list(data.get_db().jobs.find({}))


@pytest.fixture()
def instant_chain(monkeypatch):
    """Every stage succeeds at once and returns a fixed stream."""

    def chain(stage_specs, _source, stage_context=None):
        for spec in stage_specs:
            with stage_context(spec["id"]):
                pass
        return io.BytesIO(b"reconstructed")

    monkeypatch.setattr("app.recon.routes.run_chain", chain)
    monkeypatch.setattr("app.mrds.routes.run_chain", chain)


def reconstruct(db_client, user, sub, file_id):
    return db_client.post("/api/recon", headers=user(sub),
                          json={"fileId": str(file_id), "stages": STAGES})


@pytest.mark.parametrize("sub, name, allowed", [
    (ALICE, "alice-private", True),
    (BOB, "alice-private", False),
    (BOB, "team-file", True),
    (CAROL, "team-file", False),
    (CAROL, "public-file", True),
    (CAROL, "legacy-file", True),
])
@pytest.mark.usefixtures("instant_chain")
def test_recon_starts_only_on_a_file_the_caller_may_see(
        db_app, db_client, user, fake_s3, await_job, sub, name, allowed):
    ids = seed(db_app)
    fake_s3.staged[f"mrd_files/{name}"] = b"raw scan"
    response = reconstruct(db_client, user, sub, ids[name])
    if allowed:
        assert response.status_code == 202
        assert await_job(response.get_json()["jobId"])["status"] == "succeeded"
    else:
        assert response.status_code == 404
        assert jobs_in(db_app) == []
        assert not fake_s3.uploaded


@pytest.mark.usefixtures("instant_chain")
def test_a_reconstruction_is_private_to_whoever_ran_it(
        db_app, db_client, user, fake_s3, await_job):
    """Bob reconstructs a team file: the output is Bob's alone, not the team's."""
    ids = seed(db_app)
    fake_s3.staged["mrd_files/team-file"] = b"raw scan"
    job_id = reconstruct(db_client, user, BOB, ids["team-file"]).get_json()["jobId"]
    output_id = await_job(job_id)["output_file_id"]

    with db_app.app_context():
        assert data.get_mrdfile_by_id_with_auth(output_id, BOB) is not None
        assert data.get_mrdfile_by_id_with_auth(output_id, ALICE) is None
        assert data.get_public_mrdfile_by_id(output_id) is None
    assert db_client.get(f"/api/mrd-files/{output_id}", headers=user(ALICE)).status_code == 404


@pytest.mark.usefixtures("instant_chain")
def test_a_job_is_visible_only_to_the_user_who_started_it(
        db_app, db_client, user, fake_s3, await_job):
    ids = seed(db_app)
    fake_s3.staged["mrd_files/team-file"] = b"raw scan"
    job_id = reconstruct(db_client, user, ALICE, ids["team-file"]).get_json()["jobId"]
    await_job(job_id)

    assert db_client.get(f"/api/jobs/{job_id}", headers=user(ALICE)).status_code == 200
    listed = db_client.get("/api/jobs", headers=user(ALICE)).get_json()
    assert [j["_id"] for j in listed] == [job_id]

    # Bob can see the input file, but not Alice's run over it or what it made.
    stranger = db_client.get(f"/api/jobs/{job_id}", headers=user(BOB))
    assert stranger.status_code == 404
    assert stranger.get_json()["code"] == "not_found"
    assert db_client.get("/api/jobs", headers=user(BOB)).get_json() == []
    assert db_client.get(f"/api/jobs?fileId={ids['team-file']}",
                         headers=user(BOB)).get_json() == []


def _staged_head(fake_s3):
    """The request-time S3 client: head_object answers from fake_s3.staged."""

    def head_object(Bucket, Key):  # pylint: disable=invalid-name,unused-argument
        if Key not in fake_s3.staged:
            raise ClientError({"Error": {"Code": "404"}}, "HeadObject")
        return {"ContentLength": len(fake_s3.staged[Key])}

    s3 = mock.Mock()
    s3.head_object.side_effect = head_object
    return s3


@pytest.mark.usefixtures("instant_chain")
def test_a_converted_file_lands_in_the_group_the_uploader_chose(
        db_app, db_client, user, fake_s3, await_job, monkeypatch):
    seed(db_app)
    upload_id = str(ObjectId())
    fake_s3.staged[f"uploads/staging/{ALICE}/{upload_id}"] = b"tar bytes"
    monkeypatch.setattr("app.mrds.routes.read_mrdfile_header",
                        lambda source, **kw: {"fileName": "converted", "groupName": None,
                                              "ownerId": None, "studyDate": "20260102",
                                              "studyTime": "0"})
    with mock.patch("app.mrds.routes.get_s3_client", return_value=_staged_head(fake_s3)):
        response = db_client.post(
            f"/api/uploads/{upload_id}/convert", headers=user(ALICE),
            json={"filename": "scan.tar", "converter": "convert", "groupName": "team-a"})
    assert response.status_code == 202
    assert await_job(response.get_json()["jobId"])["status"] == "succeeded"

    assert "converted" in visible_to(db_app, ALICE)
    assert "converted" in visible_to(db_app, BOB)
    assert "converted" not in visible_to(db_app, CAROL)


@pytest.mark.usefixtures("instant_chain")
def test_convert_reads_only_the_callers_own_staging_prefix(db_app, db_client, user, fake_s3):
    """Bob cannot convert an object Alice staged by guessing its upload id."""
    seed(db_app)
    upload_id = str(ObjectId())
    fake_s3.staged[f"uploads/staging/{ALICE}/{upload_id}"] = b"tar bytes"
    with mock.patch("app.mrds.routes.get_s3_client", return_value=_staged_head(fake_s3)):
        response = db_client.post(
            f"/api/uploads/{upload_id}/convert", headers=user(BOB),
            json={"filename": "scan.tar", "converter": "convert"})
    assert response.status_code == 404
    assert jobs_in(db_app) == []


def test_startup_indexes_make_group_names_unique(db_app):
    db = db_app.mongo_client.get_database(db_app.config["MONGO_DB_NAME"])
    data.ensure_indexes(db)
    data.ensure_indexes(db)

    assert db.groups.index_information()["name_1"]["unique"] is True
    assert {"ownerId_1", "groupName_1", "groupName_1_studyDate_-1_studyTime_-1"} <= set(
        db.mrdfiles.index_information()
    )
    db.groups.insert_one({"name": "lab", "members": []})
    with pytest.raises(DuplicateKeyError):
        db.groups.insert_one({"name": "lab", "members": []})
