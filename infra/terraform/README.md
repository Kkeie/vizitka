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
