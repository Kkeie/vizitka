#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env.yc" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.yc"
  set +a
fi

APP_NAME="${APP_NAME:-vizitka}"
REGISTRY_HOST="${REGISTRY_HOST:-cr.yandex}"
PLATFORM="${PLATFORM:-linux/amd64}"
VITE_BACKEND_API_URL="${VITE_BACKEND_API_URL:-/api}"
FRONTEND_URL="${FRONTEND_URL:-}"
DOMAIN="${DOMAIN:-}"
COI_APP_DIR="${COI_APP_DIR:-/var/lib/${APP_NAME}}"
COI_BACKEND_PORT="${COI_BACKEND_PORT:-3000}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

usage() {
  cat <<'EOF'
Deploy app to Yandex Cloud Container Optimized Image (COI).

Required environment:
  YC_REGISTRY_ID        Yandex Container Registry ID.
  YC_INSTANCE_NAME      Existing COI VM name, or VM name to create with YC_CREATE_VM=1.
                        For existing VMs, YC_INSTANCE_ID can be used instead.
  JWT_SECRET            Stable secret, at least 32 chars. Keep it unchanged between deploys.

Optional:
  YC_PROFILE            Yandex Cloud CLI profile.
  IMAGE_TAG             Docker tag. Default: git short SHA or timestamp.
  APP_NAME              Image/container prefix. Default: vizitka.
  PLATFORM              Docker build platform. Default: linux/amd64.
  FRONTEND_URL          Backend CORS origin, e.g. https://example.com.
  YC_SERVICE_ACCOUNT_NAME  Service account for pulling images from Container Registry.
                           For existing VMs, if set, it will be attached before deploy.
  COI_APP_DIR           Host dir for DB/uploads on VM. Default: /var/lib/$APP_NAME.
  COI_HTTP_PORT         Public frontend port on VM. Default: 80.
  COI_BACKEND_PORT      Internal backend port. Default: 3000.
  SKIP_DOCKER_LOGIN=1   Skip yc registry Docker credential helper setup.
  SKIP_BUILD=1          Skip local docker build.
  SKIP_PUSH=1           Skip docker push.
  DRY_RUN=1             Print generated compose and exit before yc update/create.

Create VM mode:
  YC_CREATE_VM=1
  YC_ZONE               Zone, e.g. ru-central1-a.
  YC_SUBNET_NAME        Subnet name for the VM.
  YC_SERVICE_ACCOUNT_NAME  Service account with permission to pull images.
  YC_SSH_KEY            Path to public SSH key. Default: ~/.ssh/id_rsa.pub.
  YC_VM_CORES           Default: 2.
  YC_VM_MEMORY          Default: 2GB.
  YC_VM_DISK_SIZE       Default: 30GB.
  YC_VM_PREEMPTIBLE     Default: false.

Examples:
  cp .env.yc.example .env.yc
  $EDITOR .env.yc
  scripts/deploy-yc-coi.sh

  YC_CREATE_VM=1 scripts/deploy-yc-coi.sh
EOF
}

log() {
  printf '[yc-coi] %s\n' "$*" >&2
}

die() {
  printf '[yc-coi] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Command '$1' is required"
}

require_var() {
  local name="$1"
  [[ -n "${!name:-}" ]] || die "Required env var $name is not set"
}

yaml_quote() {
  local value="${1:-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  printf '"%s"' "$value"
}

yc_call() {
  if [[ -n "${YC_PROFILE:-}" ]]; then
    command yc "$@" --profile "$YC_PROFILE"
  else
    command yc "$@"
  fi
}

extract_service_account_id() {
  local instance_json="$1"
  printf '%s\n' "$instance_json" | sed -nE 's/.*"service_account_id":[[:space:]]*"([^"]+)".*/\1/p' | head -n 1
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ "${DRY_RUN:-0}" != "1" ]]; then
  require_cmd yc
  if [[ "${SKIP_DOCKER_LOGIN:-0}" != "1" || "${SKIP_BUILD:-0}" != "1" || "${SKIP_PUSH:-0}" != "1" ]]; then
    require_cmd docker
  fi
fi
require_var YC_REGISTRY_ID
if [[ "${YC_CREATE_VM:-0}" == "1" ]]; then
  require_var YC_INSTANCE_NAME
else
  if [[ -z "${YC_INSTANCE_ID:-}" && -z "${YC_INSTANCE_NAME:-}" ]]; then
    die "Required env var YC_INSTANCE_NAME or YC_INSTANCE_ID is not set"
  fi
fi
require_var JWT_SECRET

if (( ${#JWT_SECRET} < 32 )); then
  die "JWT_SECRET must contain at least 32 characters"
fi

BACKEND_IMAGE="${REGISTRY_HOST}/${YC_REGISTRY_ID}/${APP_NAME}-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${REGISTRY_HOST}/${YC_REGISTRY_ID}/${APP_NAME}-frontend:${IMAGE_TAG}"
NGINX_IMAGE="${REGISTRY_HOST}/${YC_REGISTRY_ID}/${APP_NAME}-nginx:${IMAGE_TAG}"
YC_INSTANCE_REF="${YC_INSTANCE_ID:-${YC_INSTANCE_NAME:-}}"

if [[ "${DRY_RUN:-0}" != "1" && "${YC_CREATE_VM:-0}" != "1" ]]; then
  if [[ -n "${YC_SERVICE_ACCOUNT_NAME:-}" ]]; then
    log "Attaching service account '$YC_SERVICE_ACCOUNT_NAME' to existing VM: $YC_INSTANCE_REF"
    yc_call compute instance update \
      "$YC_INSTANCE_REF" \
      --service-account-name "$YC_SERVICE_ACCOUNT_NAME" \
      >/dev/null
  fi

  log "Checking service account on existing COI VM: $YC_INSTANCE_REF"
  instance_json="$(yc_call compute instance get "$YC_INSTANCE_REF" --full --format json)"
  instance_service_account_id="$(extract_service_account_id "$instance_json")"
  if [[ -z "$instance_service_account_id" ]]; then
    die "Existing COI VM '$YC_INSTANCE_REF' has no service account attached. COI cannot pull private images from ${REGISTRY_HOST}/${YC_REGISTRY_ID} without registry credentials. Attach a service account manually or set YC_SERVICE_ACCOUNT_NAME and rerun."
  fi
fi

COMPOSE_FILE="$(mktemp "${TMPDIR:-/tmp}/${APP_NAME}-coi-compose.XXXXXX.yml")"
chmod 600 "$COMPOSE_FILE"
cleanup() {
  if [[ "${KEEP_GENERATED_COMPOSE:-0}" != "1" ]]; then
    rm -f "$COMPOSE_FILE"
  else
    log "Generated compose kept at: $COMPOSE_FILE"
  fi
}
trap cleanup EXIT

cat >"$COMPOSE_FILE" <<EOF
version: "3.7"

services:
  backend:
    image: $(yaml_quote "$BACKEND_IMAGE")
    container_name: ${APP_NAME}-backend
    restart: always
    environment:
      NODE_ENV: "production"
      DOCKER: "1"
      PORT: $(yaml_quote "$COI_BACKEND_PORT")
      DATABASE_PATH: "/app/data/db.sqlite"
      UPLOAD_DIR: "/app/uploads"
      JWT_SECRET: $(yaml_quote "$JWT_SECRET")
      FRONTEND_URL: $(yaml_quote "${FRONTEND_URL:-https://${DOMAIN}}")
    volumes:
      - ${COI_APP_DIR}/data:/app/data
      - ${COI_APP_DIR}/uploads:/app/uploads

  frontend:
    image: $(yaml_quote "$FRONTEND_IMAGE")
    container_name: ${APP_NAME}-frontend
    restart: always
    depends_on:
      - backend
    environment:
      PORT: "80"

  nginx:
    image: $(yaml_quote "$NGINX_IMAGE")
    container_name: ${APP_NAME}-nginx
    restart: always
    depends_on:
      - backend
      - frontend
    ports:
      - "80:80"
      - "443:443"
    environment:
      DOMAIN: $(yaml_quote "$DOMAIN")
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt

  certbot:
    image: "certbot/certbot"
    container_name: ${APP_NAME}-certbot
    restart: unless-stopped
    command: sh -c "trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot --quiet; sleep 12h & wait \$\${!}; done"
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt

volumes:
  certbot_www:
  certbot_conf:
EOF

if [[ "${DRY_RUN:-0}" == "1" ]]; then
  log "DRY_RUN=1, generated Docker Compose for COI:"
  sed 's/JWT_SECRET: .*/JWT_SECRET: "***"/' "$COMPOSE_FILE"
  exit 0
fi

if [[ "${SKIP_DOCKER_LOGIN:-0}" != "1" ]]; then
  log "Configuring Docker credentials for Yandex registry"
  yc_call container registry configure-docker
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  log "Building backend image: $BACKEND_IMAGE"
  docker build \
    --platform "$PLATFORM" \
    --build-arg "NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmjs.org/}" \
    -t "$BACKEND_IMAGE" \
    -f backend/Dockerfile \
    backend

  log "Building frontend image: $FRONTEND_IMAGE"
  docker build \
    --platform "$PLATFORM" \
    --build-arg "NPM_REGISTRY=${NPM_REGISTRY:-https://registry.npmjs.org/}" \
    --build-arg "VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL}" \
    -t "$FRONTEND_IMAGE" \
    -f frontend/Dockerfile \
    frontend

  log "Building nginx image: $NGINX_IMAGE"
  docker build \
    --platform "$PLATFORM" \
    -t "$NGINX_IMAGE" \
    nginx
fi

if [[ "${SKIP_PUSH:-0}" != "1" ]]; then
  log "Pushing backend image"
  docker push "$BACKEND_IMAGE"
  log "Pushing frontend image"
  docker push "$FRONTEND_IMAGE"
  log "Pushing nginx image"
  docker push "$NGINX_IMAGE"
fi

if [[ "${YC_CREATE_VM:-0}" == "1" ]]; then
  require_var YC_ZONE
  require_var YC_SUBNET_NAME
  require_var YC_SERVICE_ACCOUNT_NAME

  YC_SSH_KEY="${YC_SSH_KEY:-$HOME/.ssh/id_rsa.pub}"
  [[ -f "$YC_SSH_KEY" ]] || die "YC_SSH_KEY file not found: $YC_SSH_KEY"

  log "Creating COI VM: $YC_INSTANCE_NAME"
  create_args=(
    compute instance create-with-container
    --name "$YC_INSTANCE_NAME"
    --zone "$YC_ZONE"
    --cores "${YC_VM_CORES:-2}"
    --memory "${YC_VM_MEMORY:-2GB}"
    --create-boot-disk "size=${YC_VM_DISK_SIZE:-30GB}"
    --network-interface "subnet-name=${YC_SUBNET_NAME},nat-ip-version=ipv4"
    --service-account-name "$YC_SERVICE_ACCOUNT_NAME"
    --ssh-key "$YC_SSH_KEY"
    --docker-compose-file "$COMPOSE_FILE"
  )
  if [[ "${YC_VM_PREEMPTIBLE:-false}" == "true" || "${YC_VM_PREEMPTIBLE:-false}" == "1" ]]; then
    create_args+=(--preemptible)
  fi
  yc_call "${create_args[@]}"
else
  log "Updating existing COI VM: $YC_INSTANCE_REF"
  yc_call compute instance update-container \
    "$YC_INSTANCE_REF" \
    --docker-compose-file "$COMPOSE_FILE"
fi

log "Deploy finished"
log "Backend image:  $BACKEND_IMAGE"
log "Frontend image: $FRONTEND_IMAGE"
