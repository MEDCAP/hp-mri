#!/bin/sh
# Logs the tyger CLI in before the API starts, so convert/recon jobs can run.
# The PEM arrives as an env var (an ECS secret), never baked into the image.
# Without TYGER_CERT_PEM (local runs) the login is skipped and jobs fail with
# stage_failed, as before.
set -eu

if [ -n "${TYGER_CERT_PEM:-}" ]; then
  : "${TYGER_SERVER_URL:?TYGER_SERVER_URL is required with TYGER_CERT_PEM}"
  : "${TYGER_SERVICE_PRINCIPAL:?TYGER_SERVICE_PRINCIPAL is required with TYGER_CERT_PEM}"

  cert="$HOME/.tyger/cert.pem"
  mkdir -p "$HOME/.tyger"
  (umask 077 && printf '%s\n' "$TYGER_CERT_PEM" > "$cert")
  unset TYGER_CERT_PEM

  tyger login "$TYGER_SERVER_URL" \
    --service-principal "$TYGER_SERVICE_PRINCIPAL" \
    --cert-file "$cert"
fi

exec "$@"
