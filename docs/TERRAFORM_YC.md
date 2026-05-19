# Terraform в проекте

Terraform-конфигурация лежит в `infra/terraform`. Она управляет инфраструктурой в Yandex Cloud и запускается через GitHub Actions workflow `.github/workflows/terraform.yml`.

## Что делает Terraform workflow

Workflow запускается в трёх случаях:

- `pull_request` в `master`, если изменились `infra/terraform/**` или `.github/workflows/terraform.yml`;
- `push` в `master`, если изменились `infra/terraform/**` или `.github/workflows/terraform.yml`;
- ручной запуск `workflow_dispatch`.

На PR workflow делает проверку и plan:

1. `terraform fmt -check -recursive`
2. `terraform init`
3. `terraform validate`
4. `terraform plan`
5. публикация plan в GitHub Actions summary
6. загрузка `tfplan` и `tfplan.txt` как artifact

На `push` в `master` workflow делает те же шаги и затем выполняет:

```bash
terraform apply -no-color -auto-approve tfplan
```

То есть безопасный рабочий процесс такой:

1. меняешь Terraform-конфиг в отдельной ветке;
2. открываешь PR;
3. смотришь plan в GitHub Actions;
4. если plan корректный, мержишь в `master`;
5. после merge workflow применяет изменения.

## Remote state

Terraform state хранится не в репозитории, а в Yandex Object Storage через S3-compatible backend.

Backend описан в `infra/terraform/versions.tf`.

Для доступа к state workflow использует:

- `TF_STATE_BUCKET`
- `TF_STATE_ACCESS_KEY_ID`
- `TF_STATE_SECRET_ACCESS_KEY`

Опциональные repository variables:

- `TF_STATE_KEY`, по умолчанию `vizitka/terraform.tfstate`;
- `TF_STATE_REGION`, по умолчанию `ru-central1`.

Локально `terraform plan` будет работать только если настроены корректные ключи доступа к state bucket.

## Авторизация в Yandex Cloud

Workflow берёт `YC_SA_KEY_JSON` из GitHub Secrets, кладёт его во временный файл и передаёт путь в Terraform через:

```text
TF_VAR_service_account_key_file
```

Также используются:

- `YC_CLOUD_ID`
- `YC_FOLDER_ID`
- `TF_VAR_cloud_id`
- `TF_VAR_folder_id`
- `TF_VAR_zone`

Provider описан в `infra/terraform/provider.tf`.

## Где менять инфраструктуру

Основной файл для не секретных настроек приложения:

```text
infra/terraform/app.auto.tfvars
```

`*.auto.tfvars` означает, что Terraform сам подхватывает этот файл при `plan` и `apply`.

Сейчас через `app.auto.tfvars` можно менять:

- `app_cores` — количество CPU cores у COI VM;
- `app_memory_gb` — память VM в GB;
- `app_core_fraction` — гарантированная доля CPU;
- `app_vm_name` — имя VM;
- `app_zone` — зона VM;
- `app_platform_id` — тип платформы;
- `app_private_ip` — приватный IP;
- `app_enable_nat` — включён ли публичный NAT;
- `app_public_ip_address` — существующий static public IP, который нужно привязать к VM;
- `app_reserve_public_ip` — создать ли новый Terraform-managed static public IP, если `app_public_ip_address` не задан;
- `app_public_ip_name` — имя Terraform-managed public IP;
- `app_public_ip_deletion_protection` — защита Terraform-managed public IP от удаления;
- `manage_app_security_group` — создавать ли отдельную Terraform-managed security group;
- `app_http_cidr_blocks` — кто может ходить на HTTP;
- `app_https_cidr_blocks` — кто может ходить на HTTPS;
- `app_ssh_cidr_blocks` — кто может ходить по SSH;
- `app_egress_cidr_blocks` — исходящий трафик.

Пример изменения размера VM:

```hcl
app_cores         = 4
app_memory_gb     = 4
app_core_fraction = 100
```

После PR GitHub Actions покажет, что именно изменится.

## Static public IP

Чтобы публичный адрес не менялся при пересоздании VM, у VM должен быть static public IP.

Текущий закреплённый адрес:

```hcl
app_public_ip_address = "93.77.185.199"
```

Этот адрес уже переведён в `reserved=true` в Yandex Cloud. DNS A-запись домена должна указывать на `93.77.185.199`.

Terraform привязывает адрес к VM через `nat_ip_address`. Если VM будет пересоздана в той же зоне, Terraform снова прикрепит этот static IP к новой VM.

Важно:

- `app_public_ip_address` должен быть static/reserved в Yandex Cloud;
- reserved IP и VM должны быть в одной availability zone;
- если поменять `app_zone`, текущий static IP из `ru-central1-a` нельзя будет привязать к VM в другой зоне;
- если оставить `app_public_ip_address = null` и `app_reserve_public_ip = false`, VM снова будет использовать ephemeral public IP, который может измениться.

Если нужен новый Terraform-managed static IP вместо существующего, можно выставить:

```hcl
app_public_ip_address = null
app_reserve_public_ip = true
```

Это создаст новый reserved public IP через Terraform, но адрес изменится один раз, потому что будет выдан новый IP.

## Что сейчас управляется Terraform

Ресурсы описаны в `infra/terraform/imported.auto.tf`.

Импортированные ресурсы:

- `yandex_container_registry.app`
- `yandex_vpc_network.main`
- `yandex_vpc_subnet.main`
- `yandex_iam_service_account.coi_puller`
- `yandex_vpc_security_group.sg_0`
- `yandex_compute_instance.app`

Большая часть импортированных ресурсов пока имеет:

```hcl
lifecycle {
  ignore_changes = all
}
```

Это значит, что Terraform знает о ресурсе, но не пытается менять его параметры. Это сделано, чтобы не сломать существующую инфраструктуру после импорта.

Для VM `yandex_compute_instance.app` полный `ignore_changes = all` снят. Terraform теперь может управлять параметрами, которые вынесены в `app.auto.tfvars`: CPU, память, core fraction, name, zone, platform, NAT/private IP, static public IP и security groups.

При этом у VM специально игнорируются:

```hcl
ignore_changes = [
  boot_disk,
  description,
  labels,
  metadata,
]
```

Причины:

- `metadata` меняет COI deploy через `yc compute instance update-container`;
- `boot_disk` может привести к опасной замене диска;
- `labels` и `description` не критичны для текущей конфигурации приложения.

## Security group и SSH

По умолчанию:

```hcl
manage_app_security_group = false
app_ssh_cidr_blocks       = []
```

При таком режиме Terraform не меняет существующую security group `sg_0`, потому что она импортирована и находится под `ignore_changes = all`. Текущий SSH-доступ не должен пропасть.

Если включить:

```hcl
manage_app_security_group = true
```

Terraform создаст новую security group и переключит VM на неё.

В этом случае `app_ssh_cidr_blocks = []` означает, что SSH ingress не будет создан. Чтобы сохранить SSH-доступ, надо явно указать CIDR:

```hcl
app_ssh_cidr_blocks = ["<your_ip>/32"]
```

`0.0.0.0/0` для SSH лучше не использовать как дефолт, потому что он открывает порт 22 всему интернету.

## Как восстановить исходные параметры

Верни baseline-значения в `infra/terraform/app.auto.tfvars`:

```hcl
app_cores         = 2
app_memory_gb     = 2
app_core_fraction = 100

app_vm_name     = "vizitka-coi"
app_zone        = "ru-central1-a"
app_platform_id = "standard-v3"
app_private_ip  = "10.128.0.15"
app_enable_nat  = true

app_public_ip_address = "93.77.185.199"
app_reserve_public_ip = false

manage_app_security_group = false
```

Затем открой PR и проверь plan.

## Что нельзя считать полным disaster recovery

Текущий Terraform не восстанавливает всю инфраструктуру “с нуля до байта”.

Он сознательно не управляет:

- содержимым COI metadata;
- boot disk;
- текущими правилами импортированной security group `sg_0`;
- деталями registry/network/subnet/service-account, пока там стоит `ignore_changes = all`.

Если понадобится полное управление этими частями, нужно снимать `ignore_changes` ресурс за ресурсом, приводить HCL к фактическому состоянию Yandex Cloud и внимательно проверять plan.
