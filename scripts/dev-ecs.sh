#!/usr/bin/env bash
# The dev ECS stack (terraform/envs/dev): a throwaway backend on PRODUCTION data.
#
#   dev-ecs.sh up [--image <tag>]     create or update, wait until healthy
#   dev-ecs.sh status                 service, last stopped task, health, age
#   dev-ecs.sh logs [--since 15m] [--grep PATTERN]
#   dev-ecs.sh token                  ID token for the test account
#   dev-ecs.sh smoke [--recon-file <id>]
#   dev-ecs.sh report [--title T] [--issue]
#   dev-ecs.sh down                   destroy everything up created
#   dev-ecs.sh create-test-user <email>   once, ever
#
# Non-interactive. Results are JSON on stdout (logs: plain text; token: the
# token; report: the file path); progress goes to stderr. Non-zero exit on
# failure. Needs aws, jq and terraform (override with TERRAFORM=...).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT/terraform/envs/dev"
STATE_DIR="$ROOT/.dev-ecs"
TERRAFORM="${TERRAFORM:-terraform}"
export AWS_REGION="${AWS_REGION:-us-east-1}"

# Production's Cognito pool and SPA client (server/app/auth.py,
# hp-mri-frontend/src/config/env.ts).
USER_POOL_ID="us-east-1_vUo50ofKI"
CLIENT_ID="4nvgf7et9f4ui0glr4ddf152r8"
TEST_USER_EMAIL_PARAM="/hpmri/dev/TEST_USER_EMAIL"
TEST_USER_PASSWORD_PARAM="/hpmri/dev/TEST_USER_PASSWORD"

log() { echo "dev-ecs: $*" >&2; }
die() { log "error: $*"; exit 1; }

tf() { "$TERRAFORM" -chdir="$TF_DIR" "$@"; }

tf_init() {
  [[ -d "$TF_DIR/.terraform" ]] || tf init -input=false >&2
}

# The ALB admits only these. Taken from the caller's public IP unless set.
allowed_cidrs() {
  if [[ -z "${TF_VAR_allowed_cidrs:-}" ]]; then
    local ip
    ip="$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')" || die "could not detect public IP; set TF_VAR_allowed_cidrs"
    export TF_VAR_allowed_cidrs="[\"$ip/32\"]"
  fi
}

out() { tf output -raw "$1"; }

require_up() {
  tf_init
  out ecs_cluster >/dev/null 2>&1 || die "stack is not up; run: dev-ecs.sh up"
}

wait_healthy() {
  local url="$1/api/health" i
  for i in $(seq 1 60); do
    if curl -fsS --max-time 5 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 5
  done
  die "$url did not return 200 within 5 minutes; run: dev-ecs.sh status && dev-ecs.sh logs"
}

cmd_up() {
  local image=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --image) image="$2"; shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done

  tf_init
  allowed_cidrs
  local vars=()
  [[ -n "$image" ]] && vars+=(-var "image_tag=$image")
  log "terraform apply (allowed_cidrs=$TF_VAR_allowed_cidrs)"
  tf apply -input=false -auto-approve "${vars[@]+"${vars[@]}"}" >&2

  local cluster service
  cluster="$(out ecs_cluster)"
  service="$(out ecs_service)"

  # The service ignores task_definition changes (CI owns revisions), so an
  # explicit image has to be rolled out here.
  if [[ -n "$image" ]]; then
    local family
    family="$(aws ecs describe-services --cluster "$cluster" --services "$service" \
      --query 'services[0].taskDefinition' --output text | sed 's#.*/##; s#:[0-9]*$##')"
    log "rolling out $family (latest revision)"
    aws ecs update-service --cluster "$cluster" --service "$service" \
      --task-definition "$family" >/dev/null
  fi

  log "waiting for the service to be stable"
  aws ecs wait services-stable --cluster "$cluster" --services "$service" \
    || die "service did not stabilise; run: dev-ecs.sh status"
  log "waiting for $(out api_url)/api/health"
  wait_healthy "$(out api_url)"

  jq -n \
    --arg api_url "$(out api_url)" \
    --arg cluster "$cluster" \
    --arg service "$service" \
    --arg log_group "$(out log_group_name)" \
    --arg image "$(running_image "$cluster" "$service")" \
    '{api_url: $api_url, cluster: $cluster, service: $service, image: $image, log_group: $log_group}'
}

running_image() {
  local td
  td="$(aws ecs describe-services --cluster "$1" --services "$2" --query 'services[0].taskDefinition' --output text)"
  aws ecs describe-task-definition --task-definition "$td" --query 'taskDefinition.containerDefinitions[0].image' --output text
}

cmd_status() {
  require_up
  local cluster service api_url svc stopped health image
  cluster="$(out ecs_cluster)"
  service="$(out ecs_service)"
  api_url="$(out api_url)"

  svc="$(aws ecs describe-services --cluster "$cluster" --services "$service" \
    --query 'services[0].{status: status, desired: desiredCount, running: runningCount, pending: pendingCount, createdAt: createdAt, taskDefinition: taskDefinition, events: events[:5].[createdAt, message]}' \
    --output json)"

  local arn
  arn="$(aws ecs list-tasks --cluster "$cluster" --service-name "$service" --desired-status STOPPED \
    --query 'taskArns[0]' --output text)"
  if [[ "$arn" != "None" && -n "$arn" ]]; then
    stopped="$(aws ecs describe-tasks --cluster "$cluster" --tasks "$arn" \
      --query 'tasks[0].{stoppedAt: stoppedAt, stoppedReason: stoppedReason, containers: containers[].{name: name, exitCode: exitCode, reason: reason}}' \
      --output json)"
  else
    stopped=null
  fi

  health="$(curl -sS --max-time 5 "$api_url/api/health" 2>&1 || true)"
  jq -e . >/dev/null 2>&1 <<<"$health" || health="$(jq -Rn --arg h "$health" '$h')"
  image="$(running_image "$cluster" "$service")"

  # A forgotten stack keeps billing; the age makes that visible.
  local age_hours
  age_hours="$(jq -r .createdAt <<<"$svc" | python3 -c 'import sys, datetime as d
created = d.datetime.fromisoformat(sys.stdin.read().strip())
print(int((d.datetime.now(d.timezone.utc) - created).total_seconds() // 3600))')"

  jq -n \
    --arg api_url "$api_url" --arg image "$image" --argjson age_hours "$age_hours" \
    --argjson service "$svc" --argjson last_stopped_task "$stopped" --argjson health "$health" \
    '{api_url: $api_url, image: $image, age_hours: $age_hours, service: $service,
      last_stopped_task: $last_stopped_task, health: $health}'
}

cmd_logs() {
  require_up
  local since="15m" grep_args=()
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --since) since="$2"; shift 2 ;;
      --grep) grep_args=(--filter-pattern "$2"); shift 2 ;;
      *) die "unknown option $1" ;;
    esac
  done
  aws logs tail "$(out log_group_name)" --since "$since" --format short "${grep_args[@]+"${grep_args[@]}"}"
}

ssm_get() {
  aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text
}

# aws_json <json> <aws args...>: pass request JSON through a private temp file,
# so a password never appears in a process listing. (The CLI rejects
# file:///dev/stdin.)
aws_json() {
  local json="$1" tmp rc=0
  shift
  tmp="$(mktemp)"
  chmod 600 "$tmp"
  printf '%s' "$json" >"$tmp"
  aws "$@" --cli-input-json "file://$tmp" || rc=$?
  rm -f "$tmp"
  return "$rc"
}

cmd_token() {
  local email password token
  email="$(ssm_get "$TEST_USER_EMAIL_PARAM")" || die "no test user; run: dev-ecs.sh create-test-user <email>"
  password="$(ssm_get "$TEST_USER_PASSWORD_PARAM")"
  token="$(aws_json "$(jq -n --arg c "$CLIENT_ID" --arg u "$email" --arg p "$password" \
    '{AuthFlow: "USER_AUTH", ClientId: $c, AuthParameters: {USERNAME: $u, PASSWORD: $p, PREFERRED_CHALLENGE: "PASSWORD"}}')" \
    cognito-idp initiate-auth --query AuthenticationResult.IdToken --output text)"
  [[ -n "$token" && "$token" != "None" ]] || die "sign-in returned no token (a challenge?)"
  echo "$token"
}

python_bin() {
  if [[ -x "$ROOT/server/venv/bin/python" ]]; then echo "$ROOT/server/venv/bin/python"; else echo python3; fi
}

cmd_smoke() {
  require_up
  mkdir -p "$STATE_DIR"
  local token rc=0
  token="$(cmd_token)"
  DEV_ECS_TOKEN="$token" "$(python_bin)" "$ROOT/scripts/dev_ecs_smoke.py" \
    --base-url "$(out api_url)" "$@" >"$STATE_DIR/last-smoke.json" || rc=$?
  cat "$STATE_DIR/last-smoke.json"
  return "$rc"
}

cmd_report() {
  local title="dev-ecs report" issue=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --title) title="$2"; shift 2 ;;
      --issue) issue=1; shift ;;
      *) die "unknown option $1" ;;
    esac
  done
  require_up
  mkdir -p "$STATE_DIR"
  local file="$STATE_DIR/report-$(date -u +%Y%m%dT%H%M%SZ).md"
  {
    echo "# $title"
    echo
    echo "- Git HEAD: \`$(git -C "$ROOT" rev-parse HEAD)\`"
    echo "- Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "## Status"
    echo '```json'
    cmd_status
    echo '```'
    echo
    echo "## Last smoke run"
    echo '```json'
    if [[ -f "$STATE_DIR/last-smoke.json" ]]; then cat "$STATE_DIR/last-smoke.json"; else echo "null"; fi
    echo '```'
    echo
    echo "## Logs (last 30 minutes, final 200 lines)"
    echo '```'
    cmd_logs --since 30m | tail -n 200
    echo '```'
  } >"$file"
  if [[ "$issue" == 1 ]]; then
    gh issue create --title "$title" --body-file "$file" --label dev-ecs >&2
  fi
  echo "$file"
}

cmd_down() {
  tf_init
  allowed_cidrs
  log "terraform destroy"
  tf destroy -input=false -auto-approve >&2
  local left
  left="$(aws ecs describe-clusters --clusters hpmri-dev --query 'clusters[?status==`ACTIVE`].clusterName' --output text)"
  [[ -z "$left" ]] || die "cluster hpmri-dev is still ACTIVE"
  jq -n '{destroyed: true}'
}

cmd_create_test_user() {
  local email="${1:?usage: dev-ecs.sh create-test-user <email>}" password
  password="$(openssl rand -base64 24)Aa1!"
  # Re-runnable: an existing user just gets a fresh password.
  if ! aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$email" >/dev/null 2>&1; then
    aws cognito-idp admin-create-user --user-pool-id "$USER_POOL_ID" --username "$email" \
      --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
      --message-action SUPPRESS >/dev/null
  fi
  aws_json "$(jq -n --arg pool "$USER_POOL_ID" --arg u "$email" --arg p "$password" \
    '{UserPoolId: $pool, Username: $u, Password: $p, Permanent: true}')" \
    cognito-idp admin-set-user-password
  aws ssm put-parameter --overwrite --name "$TEST_USER_EMAIL_PARAM" --type String --value "$email" >/dev/null
  aws_json "$(jq -n --arg n "$TEST_USER_PASSWORD_PARAM" --arg v "$password" \
    '{Name: $n, Value: $v, Type: "SecureString", Overwrite: true}')" \
    ssm put-parameter >/dev/null
  jq -n --arg email "$email" '{test_user: $email}'
}

main() {
  local cmd="${1:-}"
  [[ $# -gt 0 ]] && shift
  case "$cmd" in
    up) cmd_up "$@" ;;
    status) cmd_status ;;
    logs) cmd_logs "$@" ;;
    token) cmd_token ;;
    smoke) cmd_smoke "$@" ;;
    report) cmd_report "$@" ;;
    down) cmd_down ;;
    create-test-user) cmd_create_test_user "$@" ;;
    *) sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2; exit 2 ;;
  esac
}

main "$@"
