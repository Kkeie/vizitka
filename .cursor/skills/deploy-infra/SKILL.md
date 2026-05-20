---
name: deploy-infra
description: >-
  Works on deployment, Docker, Render, Yandex Cloud, Terraform, and GitHub
  Actions workflows. Use when editing .github/workflows, DEPLOY.md, infra/terraform,
  or scripts/deploy-*.sh.
---

# Deploy & Infra

Docs: `DEPLOY.md`, `DEPLOY_RENDER.md`, `GITHUB_PAGES_DEPLOY.md`, `infra/terraform/README.md`.

## Workflows

- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-yc.yml`
- `.github/workflows/terraform.yml`

## Env (backend in Docker)

- `DOCKER=1` — skip Render-specific paths
- `JWT_SECRET`, `FRONTEND_URL`, `DATABASE_PATH`, `UPLOAD_DIR`

## Approach

1. Read failing workflow log if CI broke → delegate **ci-investigator** subagent.
2. Smallest change; no secret values in repo.
3. Do not apply terraform destroy without explicit user approval.

## Validation

- Syntax: `terraform validate` in `infra/terraform/` when HCL changed
- No full deploy from agent unless user requests
