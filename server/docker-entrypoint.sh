#!/bin/sh
# Logs the tyger CLI in before the API starts, so convert/recon jobs can run.
#
# On ECS, TYGER_CERT_PEM arrives as a secret (SSM SecureString), with
# TYGER_SERVER_URL and TYGER_SERVICE_PRINCIPAL alongside. A login yml pointing
# at the PEM is written here.
#
# Without TYGER_CERT_PEM the login is skipped: run `tyger login` yourself
# first, or jobs fail with stage_failed.
set -eu

if [ -n "${TYGER_CERT_PEM:-}" ]; then
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
