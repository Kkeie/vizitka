# Subagents (Cursor Task tool)

Субагенты — отдельные помощники, которых **запускает основной агент** через Task. Ты пишешь задачу в чат; агент при необходимости делегирует поиск, терминал или CI.

Skills (`.cursor/skills/`) задают **процесс**. Subagents — **тяжёлую работу** без забивания основного контекста.

---

## Типы (встроенные в Cursor)

| Type | Что делает | В «Визитке» |
|------|------------|-------------|
| **explore** | Поиск по репо, read-only | Где grid, auth, blocks; цепочка Editor → API |
| **shell** | Команды в терминале | `npm test`, `build`, `trello.sh`, terraform |
| **generalPurpose** | Исследование + несколько шагов | Баг через frontend + backend + DB |
| **ci-investigator** | Один упавший CI job | `deploy.yml`, `deploy-yc.yml`, `terraform.yml` |
| **cursor-guide** | Документация Cursor | MCP, Agent mode — не код приложения |
| **best-of-n-runner** | Отдельные worktree | Два варианта реализации параллельно (с согласия) |

### Thoroughness (только explore)

| Level | Когда |
|-------|--------|
| **quick** | Один файл / один символ (`requireAuth`) |
| **medium** | Фича: grid + profile save |
| **very thorough** | Аудит всех block types, все вызовы `block-grid` |

---

## Быстрый выбор

```
Найти код, ничего не менять     → explore (readonly: true)
Прогнать тесты / build           → shell
Упал GitHub Actions              → ci-investigator
Баг: неясно фронт или бэк      → generalPurpose
                                ИЛИ explore + shell параллельно
Два варианта фикса сравнить      → best-of-n-runner (спросить пользователя)
Как настроить Cursor             → cursor-guide
```

---

## Skills × subagents (оркестрация)

| Skill | Типичные subagents |
|-------|-------------------|
| **do-task** | shell → quality-gate; explore если описание карточки неясно |
| **bugfix** | explore (repro path) → parent fixes → shell (tests) |
| **bento-grid** | explore (all `block-grid` imports) → parent edits |
| **editor-page** | explore (sections of Editor.tsx) — файл большой |
| **backend-feature** | shell (`npm test`) параллельно с правками |
| **frontend-e2e** | shell (`npm run test:e2e`) |
| **deploy-infra** / **ci-recovery** | ci-investigator + shell (terraform plan) |
| **code-review** | explore (readonly) по затронутым путям |
| **spec-check** | explore + readonly, сверка с SPEC.md |
| **api-contract** | explore (routes + api.ts pairs) |

---

## Сценарии (копируй в чат)

### 1. Do-task с параллельным quality-gate

```
Используй skill do-task. После реализации делегируй shell-субагента:
cd backend && npm test && npm run build (и frontend если трогали).
Пока shell работает — не дублируй те же команды сам.
```

### 2. Баг в сетке

```
Параллельно:
- explore (medium, readonly): цепочка resize в Editor → block-grid → PATCH profile
- shell: cd frontend && npm run build
По отчётам предложи минимальный фикс. Потом skill bugfix.
```

### 3. Editor.tsx — найти место

```
explore (quick, readonly): в Editor.tsx где обрабатывается удаление блока.
Верни номера строк и имена функций. Файлы не менять.
```

### 4. Падает только backend test

```
shell: cd backend && npx vitest run test/blocks.integration.test.ts
Верни полный stderr. Не редактируй файлы.
```

### 5. CI deploy

```
ci-investigator: failed job в .github/workflows/deploy.yml, последний run на main.
Root cause + минимальный фикс. Потом skill ci-recovery.
```

### 6. Новый API endpoint

```
explore (medium): все места profile PATCH в backend и frontend.
Потом skill api-contract для синхронизации api.ts.
shell: backend npm test && frontend npm run build.
```

### 7. E2e только

```
shell: cd frontend && npm run test:e2e
При fail — верни имя spec и строку, без правок.
```

### 8. Сверка со спекой перед «Сделано»

```
explore (readonly): прочитай docs/agents/SPEC.md секцию Block types.
skill spec-check по моим изменениям в blocks.
```

### 9. Два подхода к фиксу (редко)

```
Спроси меня, потом best-of-n-runner: вариант A — sparse anchors,
вариант B — dense reflow. Сравни отчёты, не мержи без моего OK.
```

### 10. Полное расследование бага

```
generalPurpose: после сохранения профиля layout сбрасывается на mobile.
Проследи Editor → api.ts → profile route → SQLite. Read-only сначала.
Верни гипотезу и файлы. Код меняет только родительский агент.
```

---

## Правила

1. **Субагент не видит историю чата** — повтори цель в промпте (баг, ветка, файлы).
2. **Не параллельте правки одного файла** двумя subagents.
3. **Перепроверь** `npm test` в родительском агенте перед Trello «Сделано».
4. В промпт добавляй:
   ```
   Follow docs/agents/COMMON-QUALITY-CONTRACT.md and WORKFLOWS.md.
   Repo: Визитка (bento-fullstack-ready). AGENTS.md for commands.
   ```
5. **readonly: true** для explore, если только разведка.

---

## Что возвращает subagent

Ожидай от родительского агента сводку:

- пути к файлам / функции;
- вывод команд (pass/fail);
- блокер для эскалации (`ESCALATION-MATRIX.md`).

---

## Limits

- Subagents не заменяют **do-task** / **quality-gate** — это policy в skills.
- **best-of-n-runner** — отдельные ветки; нужно одобрение пользователя.
- На Windows **shell** для Trello: `bash scripts/trello.sh` (Git Bash / WSL).

---

## Related

- Skills index: `.cursor/skills/README.md`
- User-facing how-to: `docs/agents/CURSOR.md`
- Workflows: `WORKFLOWS.md`
