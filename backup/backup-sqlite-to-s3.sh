#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '[db-backup] %s\n' "$*" >&2
}

die() {
  log "ERROR: $*"
  exit 1
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || die "Required env var $name is not set"
}

is_truthy() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

DB_PATH="${DB_PATH:-/app/data/db.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/db-backup}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-604800}"
BACKUP_RETRY_SECONDS="${BACKUP_RETRY_SECONDS:-300}"
BACKUP_RUN_ON_START="${BACKUP_RUN_ON_START:-1}"
S3_ENDPOINT_URL="${S3_ENDPOINT_URL:-https://storage.yandexcloud.net}"
S3_OBJECT_KEY="${S3_OBJECT_KEY:-db.sqlite}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ru-central1}"
export AWS_DEFAULT_REGION

require_env S3_BUCKET
require_env S3_OBJECT_KEY
require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY

[[ "$BACKUP_INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || die "BACKUP_INTERVAL_SECONDS must be an integer"
(( BACKUP_INTERVAL_SECONDS > 0 )) || die "BACKUP_INTERVAL_SECONDS must be greater than 0"
[[ "$BACKUP_RETRY_SECONDS" =~ ^[0-9]+$ ]] || die "BACKUP_RETRY_SECONDS must be an integer"
(( BACKUP_RETRY_SECONDS > 0 )) || die "BACKUP_RETRY_SECONDS must be greater than 0"

mkdir -p "$BACKUP_DIR"

backup_once() {
  local timestamp tmp_db upload_db destination integrity

  if [[ ! -f "$DB_PATH" ]]; then
    log "Database file does not exist yet: $DB_PATH"
    return 1
  fi

  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  tmp_db="${BACKUP_DIR}/db-${timestamp}.sqlite"
  upload_db="${BACKUP_DIR}/db.sqlite"
  destination="s3://${S3_BUCKET}/${S3_OBJECT_KEY}"

  rm -f "$tmp_db" "$upload_db"

  log "Creating SQLite backup from $DB_PATH"
  sqlite3 -readonly "$DB_PATH" ".backup '$tmp_db'"

  integrity="$(sqlite3 "$tmp_db" 'PRAGMA integrity_check;')"
  if [[ "$integrity" != "ok" ]]; then
    rm -f "$tmp_db"
    log "SQLite integrity_check failed: $integrity"
    return 1
  fi

  mv "$tmp_db" "$upload_db"

  log "Uploading backup to $destination"
  aws s3 cp "$upload_db" "$destination" \
    --endpoint-url "$S3_ENDPOINT_URL" \
    --no-progress

  rm -f "$upload_db"
  log "Backup uploaded successfully"
}

run_backup_or_log_error() {
  if backup_once; then
    return 0
  else
    log "Backup attempt failed"
    return 1
  fi
}

run_until_success() {
  until run_backup_or_log_error; do
    log "Retrying in ${BACKUP_RETRY_SECONDS}s"
    sleep "$BACKUP_RETRY_SECONDS" &
    wait "$!"
  done
}

if is_truthy "$BACKUP_RUN_ON_START"; then
  run_until_success
fi

while true; do
  log "Sleeping for ${BACKUP_INTERVAL_SECONDS}s before next backup"
  sleep "$BACKUP_INTERVAL_SECONDS" &
  wait "$!"
  run_until_success
done
