#!/usr/bin/env bash
#
# Copy a MongoDB database under a new name.
#
# Production ran against a database literally called `medcap_dev`, which is a
# name nobody should have to explain to a new colleague. MongoDB has no rename
# operation, so this is a dump and a restore into a new namespace.
#
#   ./scripts/rename-mongo-database.sh --dry-run
#   ./scripts/rename-mongo-database.sh
#
# This is ADDITIVE. The source database is never touched, so the application
# keeps serving from it throughout and the rollback is simply not cutting over.
# Dropping the old database is a separate, deliberate step at the end.
#
# Sequence:
#
#   1. Run this. Both databases now exist; nothing is using the new one.
#   2. Deploy with MONGO_DB_NAME=hpmri_prod (Terraform sets this).
#   3. Verify the file list loads and an upload completes.
#   4. Only then: drop the old database (command printed at the end).
#
# THE GAP: writes landing in the source between the dump and step 2 do not
# reach the copy. At ~57 requests a day, mostly reads, that window is small --
# but pick a quiet hour, and re-run this immediately before step 2 so the copy
# is as fresh as possible. The script reports the document counts on both sides
# so you can see whether anything moved.

set -euo pipefail

SOURCE_DB="${SOURCE_DB:-medcap_dev}"
TARGET_DB="${TARGET_DB:-hpmri_prod}"
DUMP_DIR="${DUMP_DIR:-$(mktemp -d -t hpmri-migrate)}"
DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

for tool in mongosh mongodump mongorestore; do
  command -v "$tool" >/dev/null || {
    echo "$tool is required. brew install mongodb-database-tools mongosh" >&2
    exit 1
  }
done

if [ -z "${MONGO_URI:-}" ]; then
  cat >&2 <<'EOF'
MONGO_URI is not set.

For an AWS-IAM cluster, export credentials first (cd server && ./setup_aws.sh)
and build the URI the way server/config.py does, or copy the connection string
from the Atlas console. It must NOT be committed anywhere.
EOF
  exit 1
fi

count() {
  mongosh "$MONGO_URI" --quiet --eval \
    "db.getSiblingDB('$1').mrdfiles.countDocuments({})" 2>/dev/null || echo "unavailable"
}

echo "Source:  $SOURCE_DB   ($(count "$SOURCE_DB") documents in mrdfiles)"
echo "Target:  $TARGET_DB   ($(count "$TARGET_DB") documents in mrdfiles)"
echo "Dump to: $DUMP_DIR"
echo

TARGET_COUNT=$(count "$TARGET_DB")
if [ "$TARGET_COUNT" != "0" ] && [ "$TARGET_COUNT" != "unavailable" ]; then
  # mongorestore would merge rather than replace, which is almost never what
  # someone re-running this wants.
  echo "REFUSING: $TARGET_DB already holds $TARGET_COUNT documents." >&2
  echo "Drop it first if you intend to re-copy:" >&2
  echo "  mongosh \"\$MONGO_URI\" --eval \"db.getSiblingDB('$TARGET_DB').dropDatabase()\"" >&2
  exit 1
fi

if $DRY_RUN; then
  echo "Dry run. Would execute:"
  echo "  mongodump    --uri=\"\$MONGO_URI\" --db=$SOURCE_DB --out=$DUMP_DIR"
  echo "  mongorestore --uri=\"\$MONGO_URI\" \\"
  echo "      --nsFrom='$SOURCE_DB.*' --nsTo='$TARGET_DB.*' $DUMP_DIR"
  exit 0
fi

echo "Dumping $SOURCE_DB ..."
mongodump --uri="$MONGO_URI" --db="$SOURCE_DB" --out="$DUMP_DIR" --quiet

echo "Restoring as $TARGET_DB ..."
mongorestore --uri="$MONGO_URI" \
  --nsFrom="$SOURCE_DB.*" --nsTo="$TARGET_DB.*" \
  --quiet "$DUMP_DIR"

SRC=$(count "$SOURCE_DB")
DST=$(count "$TARGET_DB")
echo
echo "$SOURCE_DB: $SRC documents"
echo "$TARGET_DB: $DST documents"

if [ "$SRC" != "$DST" ]; then
  echo
  echo "MISMATCH. Do not cut over. Investigate before going further." >&2
  exit 1
fi

# The dump is a full copy of the metadata; leaving it in /tmp is untidy at best.
rm -rf "$DUMP_DIR"

cat <<EOF

Counts match. $SOURCE_DB is untouched and still serving.

Next:
  1. Deploy with MONGO_DB_NAME=$TARGET_DB (terraform/envs/prod sets this).
  2. Verify: the file list loads, and an upload completes end to end.
  3. Watch for a few days, then drop the old database:

       mongosh "\$MONGO_URI" --eval "db.getSiblingDB('$SOURCE_DB').dropDatabase()"

     There is no undo for that last one, and on a free-tier cluster there are no
     automated backups to fall back on. Take a dump and keep it somewhere real
     before you run it.
EOF
