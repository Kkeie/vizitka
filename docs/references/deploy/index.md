# Deploy References

Справочные документы по деплою и инфраструктуре.

## Инфраструктура

| Документ | Описание |
|---|---|
| [`GITHUB_ACTIONS_YC_DEPLOY.md`](../../GITHUB_ACTIONS_YC_DEPLOY.md) | CI/CD через GitHub Actions на Yandex Cloud |
| [`HTTPS_SETUP.md`](../../HTTPS_SETUP.md) | Настройка HTTPS / SSL |
| [`TERRAFORM_YC.md`](../../TERRAFORM_YC.md) | Terraform для Yandex Cloud |

## Хостинг-платформы

Документы в корне проекта (исторически накопились при экспериментах с хостингами):

- `DEPLOY.md`, `DEPLOY_HOSTING.md` — общие инструкции
- `DEPLOY_RENDER*.md` — Render.com
- `RAILWAY_*.md` — Railway
- `DOCKER_COMPOSE_FIX.md` — Docker Compose
- `GITHUB_PAGES_DEPLOY.md` — GitHub Pages (только frontend)
- `LOCAL_DEV.md` — локальная разработка
- `QUICK_DEPLOY.md` — быстрый старт

## Текущая production-среда

Описана в `infra/` и `docker-compose.yml`. Использует Nginx как reverse proxy (`nginx/`).
