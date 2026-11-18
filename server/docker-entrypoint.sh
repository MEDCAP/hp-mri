#!/bin/sh
# Logs the tyger CLI in before the API starts, so convert/recon jobs can run.
#
#   Local:  mount the login folder and set TYGER_LOGIN_FILE to its yml, e.g.
#           -v ~/dev/tyger-tep:/tyger:ro -e TYGER_LOGIN_FILE=/tyger/LOGIN_FILE.yml
#   ECS:    TYGER_CERT_PEM arrives as a secret (SSM SecureString), with
#           TYGER_SERVER_URL and TYGER_SERVICE_PRINCIPAL as plain environment.
#           The same login yml is written here, pointing at the PEM.
#
# With neither, the login is skipped and jobs fail with stage_failed.
set -eu

if [ -n "${TYGER_LOGIN_FILE:-}" ]; then
  # certificatePath may be relative to the yml, as in the local login folder.
  (cd "$(dirname "$TYGER_LOGIN_FILE")" && tyger login -f "$(basename "$TYGER_LOGIN_FILE")")
elif [ -n "${TYGER_CERT_PEM:-}" ]; then
  : "${TYGER_SERVER_URL:?TYGER_SERVER_URL is required with TYGER_CERT_PEM}"
  : "${TYGER_SERVICE_PRINCIPAL:?TYGER_SERVICE_PRINCIPAL is required with TYGER_CERT_PEM}"

  dir="$HOME/.tyger"
  (
    umask 077
    mkdir -p "$dir"
    printf '%s\n' "$TYGER_CERT_PEM" > "$dir/tyger-sp.pem"
    cat > "$dir/LOGIN_FILE.yml" <<EOF
serverUrl: $TYGER_SERVER_URL
servicePrincipal: $TYGER_SERVICE_PRINCIPAL
certificatePath: $dir/tyger-sp.pem
EOF
  )
  unset TYGER_CERT_PEM
  tyger login -f "$dir/LOGIN_FILE.yml"
fi

exec "$@"
