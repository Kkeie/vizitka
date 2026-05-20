# Project skills (Визитка)

Invoke by name in Cursor Agent: «используй skill **do-task**».

## Delivery & quality

| Skill | Trigger |
|-------|---------|
| [do-task](do-task/SKILL.md) | Trello: взять задачу и довести до «Сделано» |
| [quality-gate](quality-gate/SKILL.md) | Прогнать test/build/e2e после правок |
| [bugfix](bugfix/SKILL.md) | Баг: воспроизвести → регресс-тест → фикс |
| [code-review](code-review/SKILL.md) | Ревью diff по контракту качества |
| [ci-recovery](ci-recovery/SKILL.md) | Починить падающий GitHub Actions |

## Trello

| Skill | Trigger |
|-------|---------|
| [trello-manage](trello-manage/SKILL.md) | Переместить карточку, комментарий, без полной реализации |

## Domain

| Skill | Trigger |
|-------|---------|
| [bento-grid](bento-grid/SKILL.md) | Сетка, resize, DnD, layout JSON |
| [block-types](block-types/SKILL.md) | Новый тип блока или валидация полей блока |
| [editor-page](editor-page/SKILL.md) | `Editor.tsx`, CRUD блоков, профиль в редакторе |
| [public-page](public-page/SKILL.md) | Публичная страница `/:username`, просмотры |
| [auth-flow](auth-flow/SKILL.md) | Login, register, JWT, смена пароля |
| [auth-onboarding](auth-onboarding/SKILL.md) | Только wizard `components/onboarding/*` |
| [uploads-media](uploads-media/SKILL.md) | Загрузка фото/аватара, `/uploads` |
| [api-contract](api-contract/SKILL.md) | Синхронизация `api.ts` ↔ backend routes |
| [stats-qr-metadata](stats-qr-metadata/SKILL.md) | Статистика, QR, Open Graph metadata |

## Stack

| Skill | Trigger |
|-------|---------|
| [backend-feature](backend-feature/SKILL.md) | Express routes, SQLite, integration tests |
| [frontend-feature](frontend-feature/SKILL.md) | React pages, components, `api.ts` |
| [frontend-e2e](frontend-e2e/SKILL.md) | Playwright specs |
| [deploy-infra](deploy-infra/SKILL.md) | Deploy, Terraform, Docker |

## Meta

| Skill | Trigger |
|-------|---------|
| [spec-check](spec-check/SKILL.md) | Сверить реализацию с `docs/agents/SPEC.md` |

Subagents: `docs/agents/SUBAGENTS.md`.
