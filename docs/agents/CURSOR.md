# Cursor Adapter

## Source of truth

1. `docs/agents/COMMON-QUALITY-CONTRACT.md`
2. `docs/agents/WORKFLOWS.md`
3. `docs/agents/ESCALATION-MATRIX.md`

## Skills (20)

Полный индекс: `.cursor/skills/README.md`.

| Skill | Use when |
|-------|----------|
| **do-task** | Trello: полный цикл до «Сделано» |
| **quality-gate** | test / build / e2e после правок |
| **bugfix** | Баг + регрессионный тест |
| **code-review** | Ревью по контракту качества |
| **ci-recovery** | Починка GitHub Actions |
| **trello-manage** | Статус/комментарий без реализации |
| **bento-grid** | Сетка, layout, resize, DnD |
| **block-types** | Типы блоков, валидация полей |
| **editor-page** | `Editor.tsx`, модалки, CRUD в редакторе |
| **public-page** | Публичная `/:username` |
| **auth-flow** | Login, JWT, register, пароль |
| **auth-onboarding** | Только wizard onboarding |
| **uploads-media** | Фото, `/uploads` |
| **api-contract** | Синхронизация api.ts ↔ routes |
| **stats-qr-metadata** | Просмотры, QR, OG metadata |
| **backend-feature** | Express, SQLite, tests |
| **frontend-feature** | React, components, api.ts |
| **frontend-e2e** | Playwright |
| **deploy-infra** | Deploy, Terraform, Docker |
| **spec-check** | Сверка с SPEC.md |

Примеры: «**do-task**», «**bugfix** для …», «**spec-check** перед закрытием карточки».

## Subagents

`docs/agents/SUBAGENTS.md` — 10 готовых сценариев, таблица skill×subagent.

Кратко: **explore** = поиск; **shell** = терминал; **ci-investigator** = CI; **generalPurpose** = сквозной баг.

Пример: «Параллельно **explore** ищет resize в Editor, **shell** гоняет backend test».

## Trello

MCP (`.mcp.json`) или `bash scripts/trello.sh` (Git Bash/WSL).

## Prompt preface

```
Follow docs/agents/COMMON-QUALITY-CONTRACT.md and WORKFLOWS.md.
Escalation: docs/agents/ESCALATION-MATRIX.md.
```

Trello: `Use skill do-task.`

## Commands

| Package | test | build | lint |
|---------|------|-------|------|
| backend | `npm test` | `npm run build` | — |
| frontend | `npm run test:e2e` | `npm run build` | — |
