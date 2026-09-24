"""
Access control and the write path, against a real MongoDB.

Everything else mocks the data layer, which cannot tell whether the $or query
behind "files this user may see" actually selects the right documents. These
tests do. They pin dev's rules as they stand:

  * a user sees their own private files,
  * files in any group they are a member of,
  * files in the "public" group,
  * and legacy files with neither ownerId nor groupName.

Run with a local server (skipped otherwise; CI always runs them):

    docker compose -f ../docker-compose.test.yml up -d
    MONGO_TEST_URI=mongodb://localhost:27017 pytest
"""
from unittest import mock

import pytest
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
