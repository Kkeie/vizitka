# Terraform for Yandex Cloud

This directory contains the Yandex Cloud Terraform root module.

Use Terraform `1.14.x`.

The GitHub Actions workflow runs:

- `terraform fmt -check`
- `terraform init`
- `terraform validate`
- `terraform plan`
- `terraform apply` on `master` only

## GitHub secrets

Reuse the existing deploy secrets:

- `YC_SA_KEY_JSON`
- `YC_CLOUD_ID`
- `YC_FOLDER_ID`

Add separate secrets for the Terraform state bucket:

- `TF_STATE_BUCKET`
- `TF_STATE_ACCESS_KEY_ID`
- `TF_STATE_SECRET_ACCESS_KEY`

The state bucket must already exist before the first `terraform init`.
The static access key should belong to a service account that can read and write
objects in that bucket.

Optional repository variables:

- `YC_ZONE`, default: `ru-central1-d`
- `TF_STATE_REGION`, default: `ru-central1`
- `TF_STATE_KEY`, default: `vizitka/terraform.tfstate`

## Local usage

Create a service account key file and export local values:

```bash
export TF_VAR_cloud_id="$(yc config get cloud-id)"
export TF_VAR_folder_id="$(yc config get folder-id)"
export TF_VAR_zone="ru-central1-d"
export TF_VAR_service_account_key_file="$PWD/key.json"

export AWS_ACCESS_KEY_ID="<static-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<static-secret-access-key>"
```

Initialize the backend:

```bash
terraform init \
  -backend-config="bucket=<state-bucket>" \
  -backend-config="key=vizitka/terraform.tfstate" \
  -backend-config="region=ru-central1"
```

Then run:

```bash
terraform plan
```

## Managed infrastructure configuration

The imported resources started with `lifecycle.ignore_changes = all` to avoid
accidental changes during the first import. The app VM is now partially managed
by Terraform:

- VM size: `app_cores`, `app_memory_gb`, `app_core_fraction`
- VM placement/name: `app_vm_name`, `app_zone`, `app_platform_id`
- VM network: `app_private_ip`, `app_enable_nat`, `app_public_ip_address`,
  `app_reserve_public_ip`
- optional managed security group: `manage_app_security_group`,
  `app_http_cidr_blocks`, `app_https_cidr_blocks`, `app_ssh_cidr_blocks`,
  `app_egress_cidr_blocks`

`yandex_compute_instance.app` still ignores `metadata` and `boot_disk` changes.
This is intentional: COI deploys update VM metadata with Docker Compose data,
and imported boot disk changes can force destructive replacement.

Non-secret app infrastructure settings live in `app.auto.tfvars`. Terraform
loads this file automatically in GitHub Actions and locally.

To change VM size, edit `app.auto.tfvars`:

```hcl
app_cores         = 4
app_memory_gb     = 4
app_core_fraction = 100
```

To let Terraform create and attach a dedicated app security group, set:

```hcl
manage_app_security_group = true
app_ssh_cidr_blocks       = ["203.0.113.10/32"]
```

The current static public IP is configured in `app.auto.tfvars`:

```hcl
app_public_ip_address = "93.77.185.199"
app_reserve_public_ip = false
```

The address must stay reserved/static in Yandex Cloud. If the VM is recreated in
the same zone, Terraform attaches this IP through `nat_ip_address`.

Review the plan before merging changes to `master`; the GitHub Actions workflow
applies Terraform changes automatically on `master`.

## Import existing YC resources

Requires local `yc`, `terraform`, and `jq`.

Generate initial Terraform resource blocks and import existing YC resources:

```bash
TF_STATE_BUCKET="<state-bucket>" scripts/terraform-import-yc.sh
```

To also import the existing COI VM:

```bash
TF_STATE_BUCKET="<state-bucket>" scripts/terraform-import-yc.sh --include-instance
```

The VM import is opt-in because Compute metadata can contain COI compose data and
secrets, and Terraform will store imported metadata in state.

The script writes `infra/terraform/imported.auto.tf`. Commit that file only
after the import succeeds and `terraform plan` looks correct.
