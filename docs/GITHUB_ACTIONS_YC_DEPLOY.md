# GitHub Actions CI/CD

Основной production-деплой живёт в `.github/workflows/deploy-yc.yml`. Он деплоит приложение в Yandex Cloud на COI VM через Docker-образы в Yandex Container Registry.

Есть ещё `.github/workflows/deploy.yml` для ручного деплоя фронтенда на GitHub Pages. Это отдельный вспомогательный сценарий, не основной production-деплой.

## Когда запускается

`deploy-yc.yml` запускается:

- автоматически на `push` в `master`;
- вручную через `workflow_dispatch` в GitHub Actions.

Workflow использует `concurrency: deploy-yc-main`, поэтому новый production-деплой отменяет предыдущий незавершённый запуск этой же группы.

## Из каких job состоит

В production workflow две job:

1. `build`
2. `deploy`

## Job `build`

`build` сначала делает быстрый diff-check и определяет, затронул ли push runtime-части приложения.

Runtime-входы:

- backend: `backend/Dockerfile`, `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/start.sh`, `backend/src/`
- frontend: `frontend/Dockerfile`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/nginx.conf`, `frontend/public/`, `frontend/src/`
- nginx: `nginx/Dockerfile`, `nginx/docker-entrypoint.sh`, `nginx/templates/`
- backup: `backup/Dockerfile`, `backup/backup-sqlite-to-s3.sh`

Если push меняет только документацию, тесты, workflow deploy или deploy-скрипт, то `build` быстро завершается:

- не ставит `yc`;
- не логинится в registry;
- не проверяет Docker manifests;
- не билдит Docker-образы;
- не запускает `deploy`.

Для runtime-изменений job считает content-hash теги для каждого компонента:

- `vizitka-backend:backend-<hash>`
- `vizitka-frontend:frontend-<hash>`
- `vizitka-nginx:nginx-<hash>`
- `vizitka-backup:backup-<hash>`

Потом `build` проверяет, есть ли нужный тег в Yandex Container Registry. Если тег уже есть, образ не пересобирается. Если тег отсутствует, запускается сборка и push только для этого компонента.

Пример: если изменился только `frontend/src/...`, backend не билдится и не пушится.

## Job `deploy`

`deploy` запускается только если `build` выставил `deploy=1`.

Эта job:

1. проверяет обязательные GitHub Secrets;
2. ставит Yandex Cloud CLI;
3. авторизуется через service account key;
4. запускает `scripts/deploy-yc-coi.sh`.

В `deploy` выставлены:

```text
SKIP_BUILD=1
SKIP_PUSH=1
SKIP_DOCKER_LOGIN=1
```

Поэтому deploy job не пересобирает образы. Она только берёт теги, вычисленные job `build`, генерирует Docker Compose для COI VM и обновляет контейнерную конфигурацию VM через `yc compute instance update-container`.

## Как устроен раздельный релиз backend/frontend

Backend, frontend, nginx и backup публикуются как отдельные Docker-образы. Для каждого компонента свой Dockerfile и свой content-hash тег.

Если backend не менялся:

- тег backend остаётся прежним;
- manifest check видит существующий образ;
- backend build/push пропускается;
- deploy использует существующий backend image tag.

То же самое работает для frontend, nginx и backup.

## Роль `scripts/deploy-yc-coi.sh`

Скрипт используется в двух режимах.

В build job:

```text
SKIP_DEPLOY=1
BUILD_BACKEND/BUILD_FRONTEND/BUILD_NGINX/BUILD_BACKUP
```

Скрипт только собирает и пушит нужные образы.

В deploy job:

```text
SKIP_BUILD=1
SKIP_PUSH=1
```

Скрипт только генерирует compose и обновляет COI VM.

## Nginx и HTTPS

Nginx публикуется отдельным образом `vizitka-nginx`. Он:

- слушает `80` и `443`;
- проксирует `/` на `frontend:80`;
- проксирует `/api/` и `/uploads/` на `backend:3000`;
- использует Let's Encrypt сертификаты из Docker volume `certbot_conf`;
- отдаёт ACME challenge из Docker volume `certbot_www`.

Подробная инструкция по первичной настройке сертификата лежит в `docs/HTTPS_SETUP.md`.

## GitHub Secrets

Обязательные secrets для production deploy:

- `YC_SA_KEY_JSON` — JSON key service account для GitHub Actions.
- `YC_REGISTRY_ID` — ID Yandex Container Registry.
- `JWT_SECRET` — production JWT secret, минимум 32 символа.
- `DOMAIN` — домен для Nginx и Let's Encrypt.
- `YC_INSTANCE_NAME` или `YC_INSTANCE_ID` — COI VM, которую нужно обновлять.

Опциональные:

- `YC_CLOUD_ID`
- `YC_FOLDER_ID`
- `FRONTEND_URL`
- `YC_SERVICE_ACCOUNT_NAME`
- `BACKUP_ENABLED`
- `BACKUP_S3_BUCKET`
- `BACKUP_S3_KEY`
- `BACKUP_S3_ACCESS_KEY_ID`
- `BACKUP_S3_SECRET_ACCESS_KEY`
- `BACKUP_S3_ENDPOINT_URL`
- `BACKUP_S3_REGION`

Если `BACKUP_ENABLED` не выключен, S3 secrets для backup обязательны.

## Права в Yandex Cloud

Service account из `YC_SA_KEY_JSON` должен иметь:

- право пушить образы в Container Registry, например `container-registry.images.pusher`;
- право обновлять VM, например `compute.editor` на folder.

Service account, прикреплённый к COI VM, должен иметь:

- право читать образы из registry, например `container-registry.images.puller`.

## Как проверить результат

В summary job `build` выводятся строки вида:

```text
backend=cr.yandex/<registry_id>/vizitka-backend:backend-<hash> build=0
frontend=cr.yandex/<registry_id>/vizitka-frontend:frontend-<hash> build=1
nginx=cr.yandex/<registry_id>/vizitka-nginx:nginx-<hash> build=0
backup=cr.yandex/<registry_id>/vizitka-backup:backup-<hash> build=0
```

`build=1` означает, что образ был отсутствующим и будет собран. `build=0` означает, что существующий образ переиспользуется.

Если в summary:

```text
deploy=0
```

значит runtime-изменений нет, Docker build и deploy VM пропущены.
