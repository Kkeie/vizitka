#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT_DIR/infra/terraform"
GENERATED_TF="$TF_DIR/imported.auto.tf"

INCLUDE_INSTANCE=0
INCLUDE_SECURITY_GROUPS=1
INCLUDE_SERVICE_ACCOUNTS=1
GENERATE_ONLY=0
SKIP_PLAN=0
OVERWRITE=0

usage() {
  cat <<'EOF'
Generate Terraform resource stubs for existing Yandex Cloud resources and import them.

By default the script imports safer shared resources:
  - Container Registry from YC_REGISTRY_ID
  - VPC network/subnet from YC_SUBNET_ID, YC_SUBNET_NAME, or the VM network interface
  - service accounts from YC_SA_KEY_JSON, YC_SERVICE_ACCOUNT_NAME, and the VM

The Compute instance import is opt-in because imported VM metadata may include
COI docker-compose contents and secrets in Terraform state.

Required for import:
  TF_STATE_BUCKET
  TF_STATE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID
  TF_STATE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY

Usually loaded from .env.yc or shell:
  YC_CLOUD_ID
  YC_FOLDER_ID
  YC_REGISTRY_ID
  YC_INSTANCE_NAME or YC_INSTANCE_ID
  YC_SUBNET_NAME or YC_SUBNET_ID
  YC_SERVICE_ACCOUNT_NAME

Optional:
  YC_ENV_FILE             Env file to source instead of .env.yc.

Options:
  --include-instance       Also generate/import yandex_compute_instance.app.
  --no-security-groups     Skip security group imports.
  --no-service-accounts    Skip service account imports.
  --generate-only          Only write infra/terraform/imported.auto.tf.
  --skip-plan              Do not run terraform plan after import.
  --overwrite              Overwrite existing infra/terraform/imported.auto.tf.
  -h, --help               Show this help.

Examples:
  TF_STATE_BUCKET=vizitka-terraform-state scripts/terraform-import-yc.sh
  TF_STATE_BUCKET=vizitka-terraform-state scripts/terraform-import-yc.sh --include-instance
EOF
}

log() {
  printf '[tf-import] %s\n' "$*" >&2
}

die() {
  printf '[tf-import] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Command '$1' is required"
}

is_real_value() {
  local value="${1:-}"
  [[ -n "$value" ]] || return 1
  if [[ "$value" == \<* && "$value" == *\> ]]; then
    return 1
  fi
  case "$value" in
    change_me*|your-*|crp00000000000000000) return 1 ;;
    *) return 0 ;;
  esac
}

yc_call() {
  if is_real_value "${YC_PROFILE:-}"; then
    command yc "$@" --profile "$YC_PROFILE"
  else
    command yc "$@"
  fi
}

yc_json() {
  yc_call "$@" --format json
}

hcl_string() {
  jq -Rn -r --arg value "${1:-}" '$value | @json'
}

hcl_array() {
  jq -c 'if type == "array" then map(tostring) else [] end'
}

jq_field() {
  local filter="$1"
  local input="$2"
  jq -r "$filter // empty" <<<"$input"
}

json_truthy() {
  local value="${1:-false}"
  case "$value" in
    true|TRUE|1|yes|YES|on|ON) printf 'true' ;;
    *) printf 'false' ;;
  esac
}

add_import() {
  local addr="$1"
  local id="$2"
  is_real_value "$id" || return 0
  IMPORT_ADDRS+=("$addr")
  IMPORT_IDS+=("$id")
}

state_has() {
  local addr="$1"
  terraform -chdir="$TF_DIR" state list 2>/dev/null | grep -Fxq "$addr"
}

config_has_resource() {
  local addr="$1"
  local type
  local name

  case "$addr" in
    *.*)
      type="${addr%%.*}"
      name="${addr#*.}"
      ;;
    *)
      return 1
      ;;
  esac

  grep -Eq "resource[[:space:]]+\"${type}\"[[:space:]]+\"${name}\"" "$GENERATED_TF"
}

set_service_account_addr() {
  SERVICE_ACCOUNT_IDS[${#SERVICE_ACCOUNT_IDS[@]}]="$1"
  SERVICE_ACCOUNT_ADDRS[${#SERVICE_ACCOUNT_ADDRS[@]}]="$2"
}

get_service_account_addr() {
  local id="$1"
  local i
  for ((i = 0; i < ${#SERVICE_ACCOUNT_IDS[@]}; i++)); do
    if [[ "${SERVICE_ACCOUNT_IDS[$i]}" == "$id" ]]; then
      printf '%s' "${SERVICE_ACCOUNT_ADDRS[$i]}"
      return 0
    fi
  done
  return 1
}

set_security_group_addr() {
  SECURITY_GROUP_IDS[${#SECURITY_GROUP_IDS[@]}]="$1"
  SECURITY_GROUP_ADDRS[${#SECURITY_GROUP_ADDRS[@]}]="$2"
}

get_security_group_addr() {
  local id="$1"
  local i
  for ((i = 0; i < ${#SECURITY_GROUP_IDS[@]}; i++)); do
    if [[ "${SECURITY_GROUP_IDS[$i]}" == "$id" ]]; then
      printf '%s' "${SECURITY_GROUP_ADDRS[$i]}"
      return 0
    fi
  done
  return 1
}

append_lifecycle() {
  cat >>"$TMP_TF" <<'EOF'

  lifecycle {
    ignore_changes = all
  }
EOF
}

append_registry() {
  local name="$1"
  cat >>"$TMP_TF" <<EOF

resource "yandex_container_registry" "app" {
  name      = $(hcl_string "$name")
  folder_id = var.folder_id
EOF
  append_lifecycle
  cat >>"$TMP_TF" <<'EOF'
}
EOF
}

append_network() {
  local name="$1"
  cat >>"$TMP_TF" <<EOF

resource "yandex_vpc_network" "main" {
  name      = $(hcl_string "$name")
  folder_id = var.folder_id
EOF
  append_lifecycle
  cat >>"$TMP_TF" <<'EOF'
}
EOF
}

append_subnet() {
  local name="$1"
  local zone="$2"
  local cidrs_json="$3"
  local network_ref="$4"
  cat >>"$TMP_TF" <<EOF

resource "yandex_vpc_subnet" "main" {
  name           = $(hcl_string "$name")
  folder_id      = var.folder_id
  zone           = $(hcl_string "$zone")
  network_id     = $network_ref
  v4_cidr_blocks = $cidrs_json
EOF
  append_lifecycle
  cat >>"$TMP_TF" <<'EOF'
}
EOF
}

append_security_group() {
  local local_name="$1"
  local yc_name="$2"
  local network_ref="$3"
  cat >>"$TMP_TF" <<EOF

resource "yandex_vpc_security_group" "$local_name" {
  name       = $(hcl_string "$yc_name")
  folder_id  = var.folder_id
  network_id = $network_ref
EOF
  append_lifecycle
  cat >>"$TMP_TF" <<'EOF'
}
EOF
}

append_service_account() {
  local local_name="$1"
  local yc_name="$2"
  cat >>"$TMP_TF" <<EOF

resource "yandex_iam_service_account" "$local_name" {
  name      = $(hcl_string "$yc_name")
  folder_id = var.folder_id
EOF
  append_lifecycle
  cat >>"$TMP_TF" <<'EOF'
}
EOF
}

append_instance() {
  local name="$1"
  local zone="$2"
  local platform_id="$3"
  local cores="$4"
  local memory="$5"
  local core_fraction="$6"
  local boot_disk_id="$7"
  local boot_disk_auto_delete="$8"
  local subnet_ref="$9"
  local nat="${10}"
  local private_ip="${11}"
  local sg_refs="${12}"
  local service_account_ref="${13}"

  cat >>"$TMP_TF" <<EOF

resource "yandex_compute_instance" "app" {
  name                      = $(hcl_string "$name")
  folder_id                 = var.folder_id
  zone                      = $(hcl_string "$zone")
  platform_id               = $(hcl_string "$platform_id")
  allow_stopping_for_update = true
EOF

  if [[ -n "$service_account_ref" ]]; then
    cat >>"$TMP_TF" <<EOF
  service_account_id        = $service_account_ref
EOF
  fi

  cat >>"$TMP_TF" <<EOF

  resources {
    cores         = $cores
    memory        = $memory
    core_fraction = $core_fraction
  }

  boot_disk {
    disk_id     = $(hcl_string "$boot_disk_id")
    auto_delete = $(json_truthy "$boot_disk_auto_delete")
  }

  network_interface {
    subnet_id = $subnet_ref
    nat       = $(json_truthy "$nat")
EOF

  if [[ -n "$private_ip" ]]; then
    cat >>"$TMP_TF" <<EOF
    ip_address = $(hcl_string "$private_ip")
EOF
  fi

  if [[ -n "$sg_refs" ]]; then
    cat >>"$TMP_TF" <<EOF
    security_group_ids = [$sg_refs]
EOF
  fi

  cat >>"$TMP_TF" <<'EOF'
  }
EOF
  append_lifecycle
  cat >>"$TMP_TF" <<'EOF'
}
EOF
}

for arg in "$@"; do
  case "$arg" in
    --include-instance) INCLUDE_INSTANCE=1 ;;
    --no-security-groups) INCLUDE_SECURITY_GROUPS=0 ;;
    --no-service-accounts) INCLUDE_SERVICE_ACCOUNTS=0 ;;
    --generate-only) GENERATE_ONLY=1 ;;
    --skip-plan) SKIP_PLAN=1 ;;
    --overwrite) OVERWRITE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $arg" ;;
  esac
done

[[ -d "$TF_DIR" ]] || die "Terraform directory not found: $TF_DIR"

YC_ENV_FILE="${YC_ENV_FILE:-$ROOT_DIR/.env.yc}"
if [[ -f "$YC_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$YC_ENV_FILE"
  set +a
fi

require_cmd yc
require_cmd jq
require_cmd terraform

TF_VAR_cloud_id="${TF_VAR_cloud_id:-${YC_CLOUD_ID:-}}"
TF_VAR_folder_id="${TF_VAR_folder_id:-${YC_FOLDER_ID:-}}"
TF_VAR_zone="${TF_VAR_zone:-${YC_ZONE:-ru-central1-d}}"

if ! is_real_value "$TF_VAR_cloud_id"; then
  TF_VAR_cloud_id="$(yc_call config get cloud-id 2>/dev/null || true)"
fi

if ! is_real_value "$TF_VAR_folder_id"; then
  TF_VAR_folder_id="$(yc_call config get folder-id 2>/dev/null || true)"
fi

is_real_value "$TF_VAR_cloud_id" || die "YC_CLOUD_ID or TF_VAR_cloud_id is required"
is_real_value "$TF_VAR_folder_id" || die "YC_FOLDER_ID or TF_VAR_folder_id is required"

export TF_VAR_cloud_id TF_VAR_folder_id TF_VAR_zone
export YC_CLOUD_ID="${YC_CLOUD_ID:-$TF_VAR_cloud_id}"
export YC_FOLDER_ID="${YC_FOLDER_ID:-$TF_VAR_folder_id}"

if ! is_real_value "${TF_VAR_service_account_key_file:-}"; then
  if is_real_value "${YC_SA_KEY_FILE:-}"; then
    TF_VAR_service_account_key_file="$YC_SA_KEY_FILE"
    export TF_VAR_service_account_key_file
  elif is_real_value "${YC_SA_KEY_JSON:-}"; then
    mkdir -p "$TF_DIR/.terraform"
    key_file="$TF_DIR/.terraform/yc-sa-key.json"
    printf '%s' "$YC_SA_KEY_JSON" >"$key_file"
    chmod 600 "$key_file"
    TF_VAR_service_account_key_file="$key_file"
    export TF_VAR_service_account_key_file
  elif ! is_real_value "${YC_TOKEN:-}"; then
    YC_TOKEN="$(yc_call iam create-token 2>/dev/null || true)"
    if is_real_value "$YC_TOKEN"; then
      export YC_TOKEN
    fi
  fi
fi

declare -a IMPORT_ADDRS=()
declare -a IMPORT_IDS=()
declare -a SERVICE_ACCOUNT_IDS=()
declare -a SERVICE_ACCOUNT_ADDRS=()
declare -a SECURITY_GROUP_IDS=()
declare -a SECURITY_GROUP_ADDRS=()

REGISTRY_JSON=""
INSTANCE_JSON=""
SUBNET_JSON=""
NETWORK_JSON=""
VM_SERVICE_ACCOUNT_JSON=""
DEPLOYER_SERVICE_ACCOUNT_JSON=""
COI_SERVICE_ACCOUNT_JSON=""

REGISTRY_ID=""
REGISTRY_NAME=""
INSTANCE_ID=""
INSTANCE_NAME=""
SUBNET_ID="${YC_SUBNET_ID:-}"
SUBNET_NAME="${YC_SUBNET_NAME:-}"
NETWORK_ID="${YC_NETWORK_ID:-}"
NETWORK_NAME="${YC_NETWORK_NAME:-}"

if is_real_value "${YC_REGISTRY_ID:-}"; then
  log "Reading Container Registry: $YC_REGISTRY_ID"
  REGISTRY_JSON="$(yc_json container registry get "$YC_REGISTRY_ID")"
  REGISTRY_ID="$(jq_field '.id' "$REGISTRY_JSON")"
  REGISTRY_NAME="$(jq_field '.name' "$REGISTRY_JSON")"
  if is_real_value "$REGISTRY_ID"; then
    add_import "yandex_container_registry.app" "$REGISTRY_ID"
  fi
fi

INSTANCE_REF="${YC_INSTANCE_ID:-${YC_INSTANCE_NAME:-}}"
if is_real_value "$INSTANCE_REF"; then
  log "Reading Compute instance: $INSTANCE_REF"
  INSTANCE_JSON="$(yc_json compute instance get "$INSTANCE_REF")"
  INSTANCE_ID="$(jq_field '.id' "$INSTANCE_JSON")"
  INSTANCE_NAME="$(jq_field '.name' "$INSTANCE_JSON")"

  if ! is_real_value "$SUBNET_ID"; then
    SUBNET_ID="$(jq_field '(.network_interfaces // .network_interface // [])[0].subnet_id' "$INSTANCE_JSON")"
  fi

  if ! is_real_value "$NETWORK_ID"; then
    NETWORK_ID="$(jq_field '(.network_interfaces // .network_interface // [])[0].network_id' "$INSTANCE_JSON")"
  fi
fi

if ! is_real_value "$SUBNET_ID" && is_real_value "$SUBNET_NAME"; then
  log "Reading VPC subnet by name: $SUBNET_NAME"
  SUBNET_JSON="$(yc_json vpc subnet get "$SUBNET_NAME")"
  SUBNET_ID="$(jq_field '.id' "$SUBNET_JSON")"
fi

if is_real_value "$SUBNET_ID" && [[ -z "$SUBNET_JSON" ]]; then
  log "Reading VPC subnet: $SUBNET_ID"
  SUBNET_JSON="$(yc_json vpc subnet get "$SUBNET_ID")"
fi

if [[ -n "$SUBNET_JSON" ]]; then
  SUBNET_ID="$(jq_field '.id' "$SUBNET_JSON")"
  SUBNET_NAME="$(jq_field '.name' "$SUBNET_JSON")"
  if ! is_real_value "$NETWORK_ID"; then
    NETWORK_ID="$(jq_field '.network_id' "$SUBNET_JSON")"
  fi
  if is_real_value "$SUBNET_ID"; then
    add_import "yandex_vpc_subnet.main" "$SUBNET_ID"
  fi
fi

if ! is_real_value "$NETWORK_ID" && is_real_value "$NETWORK_NAME"; then
  log "Reading VPC network by name: $NETWORK_NAME"
  NETWORK_JSON="$(yc_json vpc network get "$NETWORK_NAME")"
  NETWORK_ID="$(jq_field '.id' "$NETWORK_JSON")"
fi

if is_real_value "$NETWORK_ID" && [[ -z "$NETWORK_JSON" ]]; then
  log "Reading VPC network: $NETWORK_ID"
  NETWORK_JSON="$(yc_json vpc network get "$NETWORK_ID")"
fi

if [[ -n "$NETWORK_JSON" ]]; then
  NETWORK_ID="$(jq_field '.id' "$NETWORK_JSON")"
  NETWORK_NAME="$(jq_field '.name' "$NETWORK_JSON")"
  if is_real_value "$NETWORK_ID"; then
    add_import "yandex_vpc_network.main" "$NETWORK_ID"
  fi
fi

if (( INCLUDE_SERVICE_ACCOUNTS )); then
  deployer_sa_id=""
  if is_real_value "${YC_SA_KEY_JSON:-}"; then
    deployer_sa_id="$(jq -r '.service_account_id // empty' <<<"$YC_SA_KEY_JSON" 2>/dev/null || true)"
  elif is_real_value "${TF_VAR_service_account_key_file:-}" && [[ -f "$TF_VAR_service_account_key_file" ]]; then
    deployer_sa_id="$(jq -r '.service_account_id // empty' "$TF_VAR_service_account_key_file" 2>/dev/null || true)"
  fi

  if is_real_value "$deployer_sa_id"; then
    log "Reading deployer service account: $deployer_sa_id"
    DEPLOYER_SERVICE_ACCOUNT_JSON="$(yc_json iam service-account get "$deployer_sa_id")"
    deployer_sa_name="$(jq_field '.name' "$DEPLOYER_SERVICE_ACCOUNT_JSON")"
    if is_real_value "$deployer_sa_name"; then
      set_service_account_addr "$deployer_sa_id" "yandex_iam_service_account.github_actions"
      add_import "yandex_iam_service_account.github_actions" "$deployer_sa_id"
    fi
  fi

  if is_real_value "${YC_SERVICE_ACCOUNT_NAME:-}"; then
    log "Reading COI service account: $YC_SERVICE_ACCOUNT_NAME"
    COI_SERVICE_ACCOUNT_JSON="$(yc_json iam service-account get "$YC_SERVICE_ACCOUNT_NAME")"
    coi_sa_id="$(jq_field '.id' "$COI_SERVICE_ACCOUNT_JSON")"
    if is_real_value "$coi_sa_id" && [[ -z "$(get_service_account_addr "$coi_sa_id" || true)" ]]; then
      set_service_account_addr "$coi_sa_id" "yandex_iam_service_account.coi_puller"
      add_import "yandex_iam_service_account.coi_puller" "$coi_sa_id"
    fi
  fi

  if [[ -n "$INSTANCE_JSON" ]]; then
    vm_sa_id="$(jq_field '.service_account_id' "$INSTANCE_JSON")"
    if is_real_value "$vm_sa_id" && [[ -z "$(get_service_account_addr "$vm_sa_id" || true)" ]]; then
      log "Reading VM service account: $vm_sa_id"
      VM_SERVICE_ACCOUNT_JSON="$(yc_json iam service-account get "$vm_sa_id")"
      set_service_account_addr "$vm_sa_id" "yandex_iam_service_account.vm"
      add_import "yandex_iam_service_account.vm" "$vm_sa_id"
    fi
  fi
fi

SECURITY_GROUP_IDS_JSON="[]"
if (( INCLUDE_SECURITY_GROUPS )) && [[ -n "$INSTANCE_JSON" ]]; then
  SECURITY_GROUP_IDS_JSON="$(jq -c '((.network_interfaces // .network_interface // [])[0].security_group_ids // []) | map(tostring)' <<<"$INSTANCE_JSON")"
fi

TMP_TF="$(mktemp "${TMPDIR:-/tmp}/vizitka-imported.XXXXXX.tf")"
cleanup() {
  rm -f "$TMP_TF"
}
trap cleanup EXIT

cat >"$TMP_TF" <<'EOF'
# Generated by scripts/terraform-import-yc.sh.
# Review this file after import. lifecycle.ignore_changes is intentional for
# the first import pass; remove it resource by resource after the HCL matches YC.
EOF

if is_real_value "$REGISTRY_ID"; then
  append_registry "${REGISTRY_NAME:-vizitka}"
fi

NETWORK_REF=""
if is_real_value "$NETWORK_ID"; then
  append_network "${NETWORK_NAME:-main}"
  NETWORK_REF="yandex_vpc_network.main.id"
fi
if [[ -z "$NETWORK_REF" ]] && is_real_value "$NETWORK_ID"; then
  NETWORK_REF="$(hcl_string "$NETWORK_ID")"
fi

SUBNET_REF=""
if is_real_value "$SUBNET_ID" && [[ -n "$SUBNET_JSON" ]]; then
  subnet_zone="$(jq_field '.zone_id // .zone' "$SUBNET_JSON")"
  subnet_cidrs="$(jq '(.v4_cidr_blocks // [])' <<<"$SUBNET_JSON" | hcl_array)"
  [[ "$subnet_cidrs" != "[]" ]] || die "Subnet $SUBNET_ID has no v4_cidr_blocks in yc output"
  if [[ -z "$NETWORK_REF" ]]; then
    NETWORK_REF="$(hcl_string "$NETWORK_ID")"
  fi
  append_subnet "${SUBNET_NAME:-main}" "${subnet_zone:-$TF_VAR_zone}" "$subnet_cidrs" "$NETWORK_REF"
  SUBNET_REF="yandex_vpc_subnet.main.id"
fi
if [[ -z "$SUBNET_REF" ]] && is_real_value "$SUBNET_ID"; then
  SUBNET_REF="$(hcl_string "$SUBNET_ID")"
fi

if (( INCLUDE_SERVICE_ACCOUNTS )); then
  if [[ -n "$DEPLOYER_SERVICE_ACCOUNT_JSON" ]]; then
    deployer_sa_id="$(jq_field '.id' "$DEPLOYER_SERVICE_ACCOUNT_JSON")"
    deployer_sa_name="$(jq_field '.name' "$DEPLOYER_SERVICE_ACCOUNT_JSON")"
    if is_real_value "$deployer_sa_id"; then
      append_service_account "github_actions" "$deployer_sa_name"
    fi
  fi

  if [[ -n "$COI_SERVICE_ACCOUNT_JSON" ]]; then
    coi_sa_id="$(jq_field '.id' "$COI_SERVICE_ACCOUNT_JSON")"
    coi_sa_name="$(jq_field '.name' "$COI_SERVICE_ACCOUNT_JSON")"
    if is_real_value "$coi_sa_id" && [[ "$(get_service_account_addr "$coi_sa_id" || true)" == "yandex_iam_service_account.coi_puller" ]]; then
      append_service_account "coi_puller" "$coi_sa_name"
    fi
  fi

  if [[ -n "$VM_SERVICE_ACCOUNT_JSON" ]]; then
    vm_sa_id="$(jq_field '.id' "$VM_SERVICE_ACCOUNT_JSON")"
    vm_sa_name="$(jq_field '.name' "$VM_SERVICE_ACCOUNT_JSON")"
    if is_real_value "$vm_sa_id" && [[ "$(get_service_account_addr "$vm_sa_id" || true)" == "yandex_iam_service_account.vm" ]]; then
      append_service_account "vm" "$vm_sa_name"
    fi
  fi
fi

if (( INCLUDE_SECURITY_GROUPS )); then
  sg_count="$(jq 'length' <<<"$SECURITY_GROUP_IDS_JSON")"
  for ((i = 0; i < sg_count; i++)); do
    sg_id="$(jq -r ".[$i]" <<<"$SECURITY_GROUP_IDS_JSON")"
    is_real_value "$sg_id" || continue
    log "Reading security group: $sg_id"
    sg_json="$(yc_json vpc security-group get "$sg_id")"
    sg_name="$(jq_field '.name' "$sg_json")"
    sg_local_name="sg_$i"
    set_security_group_addr "$sg_id" "yandex_vpc_security_group.$sg_local_name"
    add_import "yandex_vpc_security_group.$sg_local_name" "$sg_id"
    append_security_group "$sg_local_name" "${sg_name:-$sg_local_name}" "$NETWORK_REF"
  done
fi

if (( INCLUDE_INSTANCE )); then
  [[ -n "$INSTANCE_JSON" ]] || die "--include-instance needs YC_INSTANCE_ID or YC_INSTANCE_NAME"
  is_real_value "$SUBNET_REF" || die "Cannot generate VM resource without subnet id"

  log "Including Compute instance import. VM metadata may be stored in Terraform state."
  instance_zone="$(jq_field '.zone_id // .zone' "$INSTANCE_JSON")"
  instance_platform="$(jq_field '.platform_id' "$INSTANCE_JSON")"
  instance_cores="$(jq_field '.resources.cores' "$INSTANCE_JSON")"
  instance_core_fraction="$(jq_field '.resources.core_fraction' "$INSTANCE_JSON")"
  instance_memory="$(jq -r '(.resources.memory // .resources.memory_gb // 2) | tonumber | if . > 1024 then (. / 1073741824) else . end' <<<"$INSTANCE_JSON")"
  boot_disk_id="$(jq_field '.boot_disk.disk_id' "$INSTANCE_JSON")"
  boot_disk_auto_delete="$(jq_field '.boot_disk.auto_delete' "$INSTANCE_JSON")"
  nat_enabled="$(jq -r '((.network_interfaces // .network_interface // [])[0].primary_v4_address.one_to_one_nat // null) != null' <<<"$INSTANCE_JSON")"
  private_ip="$(jq_field '(.network_interfaces // .network_interface // [])[0].primary_v4_address.address' "$INSTANCE_JSON")"
  vm_sa_id="$(jq_field '.service_account_id' "$INSTANCE_JSON")"

  is_real_value "$INSTANCE_ID" || die "Cannot determine instance id"
  is_real_value "$boot_disk_id" || die "Cannot determine VM boot disk id"

  sg_refs=""
  if (( INCLUDE_SECURITY_GROUPS )); then
    sg_count="$(jq 'length' <<<"$SECURITY_GROUP_IDS_JSON")"
    for ((i = 0; i < sg_count; i++)); do
      sg_id="$(jq -r ".[$i]" <<<"$SECURITY_GROUP_IDS_JSON")"
      addr="$(get_security_group_addr "$sg_id" || true)"
      [[ -n "$addr" ]] || continue
      if [[ -n "$sg_refs" ]]; then
        sg_refs+=", "
      fi
      sg_refs+="$addr.id"
    done
  fi

  service_account_ref=""
  vm_sa_addr="$(get_service_account_addr "$vm_sa_id" || true)"
  if is_real_value "$vm_sa_id" && [[ -n "$vm_sa_addr" ]]; then
    service_account_ref="$vm_sa_addr.id"
  elif is_real_value "$vm_sa_id"; then
    service_account_ref="$(hcl_string "$vm_sa_id")"
  fi

  append_instance \
    "${INSTANCE_NAME:-vizitka-coi}" \
    "${instance_zone:-$TF_VAR_zone}" \
    "${instance_platform:-standard-v3}" \
    "${instance_cores:-2}" \
    "${instance_memory:-2}" \
    "${instance_core_fraction:-100}" \
    "$boot_disk_id" \
    "${boot_disk_auto_delete:-true}" \
    "$SUBNET_REF" \
    "$nat_enabled" \
    "$private_ip" \
    "$sg_refs" \
    "$service_account_ref"
  add_import "yandex_compute_instance.app" "$INSTANCE_ID"
fi

if [[ -f "$GENERATED_TF" && "$OVERWRITE" != "1" ]]; then
  log "Keeping existing $GENERATED_TF. Use --overwrite to regenerate it."
  for i in "${!IMPORT_ADDRS[@]}"; do
    if ! config_has_resource "${IMPORT_ADDRS[$i]}"; then
      die "Existing imported.auto.tf does not contain ${IMPORT_ADDRS[$i]}. Rerun with --overwrite to regenerate it before import."
    fi
  done
  rm -f "$TMP_TF"
  trap - EXIT
else
  mv "$TMP_TF" "$GENERATED_TF"
  trap - EXIT
  log "Wrote $GENERATED_TF"
fi

if (( GENERATE_ONLY )); then
  log "Generation only requested; skipping terraform import."
  exit 0
fi

TF_STATE_KEY="${TF_STATE_KEY:-vizitka/terraform.tfstate}"
TF_STATE_REGION="${TF_STATE_REGION:-ru-central1}"

is_real_value "${TF_STATE_BUCKET:-}" || die "TF_STATE_BUCKET is required for remote state import"

if ! is_real_value "${AWS_ACCESS_KEY_ID:-}"; then
  if is_real_value "${TF_STATE_ACCESS_KEY_ID:-}"; then
    AWS_ACCESS_KEY_ID="$TF_STATE_ACCESS_KEY_ID"
  elif is_real_value "${BACKUP_S3_ACCESS_KEY_ID:-}"; then
    log "Using BACKUP_S3_ACCESS_KEY_ID as AWS_ACCESS_KEY_ID"
    AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
  fi
fi

if ! is_real_value "${AWS_SECRET_ACCESS_KEY:-}"; then
  if is_real_value "${TF_STATE_SECRET_ACCESS_KEY:-}"; then
    AWS_SECRET_ACCESS_KEY="$TF_STATE_SECRET_ACCESS_KEY"
  elif is_real_value "${BACKUP_S3_SECRET_ACCESS_KEY:-}"; then
    log "Using BACKUP_S3_SECRET_ACCESS_KEY as AWS_SECRET_ACCESS_KEY"
    AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
  fi
fi

is_real_value "${AWS_ACCESS_KEY_ID:-}" || die "TF_STATE_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID is required"
is_real_value "${AWS_SECRET_ACCESS_KEY:-}" || die "TF_STATE_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY is required"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_EC2_METADATA_DISABLED=true

log "Initializing Terraform backend bucket=$TF_STATE_BUCKET key=$TF_STATE_KEY"
terraform -chdir="$TF_DIR" init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="key=${TF_STATE_KEY}" \
  -backend-config="region=${TF_STATE_REGION}"

if (( ${#IMPORT_ADDRS[@]} == 0 )); then
  log "No resources discovered for import."
  exit 0
fi

for i in "${!IMPORT_ADDRS[@]}"; do
  addr="${IMPORT_ADDRS[$i]}"
  id="${IMPORT_IDS[$i]}"
  if state_has "$addr"; then
    log "Already imported: $addr"
    continue
  fi
  log "Importing $addr <- $id"
  terraform -chdir="$TF_DIR" import "$addr" "$id"
done

if (( ! SKIP_PLAN )); then
  log "Running terraform plan"
  terraform -chdir="$TF_DIR" plan
fi
