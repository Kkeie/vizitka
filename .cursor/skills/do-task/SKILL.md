---
name: do-task
description: >-
  Takes the top card from Trello column «Сделать», implements it, runs quality
  checks, moves the card through «В работе» → «Тестирование» → «Сделано», and
  reports to the user. Use when the user says do-task, /do-task, «возьми задачу
  из Trello», or asks to pick up the next board task autonomously.
---

# Do Task (Trello)

Follow `docs/agents/COMMON-QUALITY-CONTRACT.md` and `docs/agents/ESCALATION-MATRIX.md` throughout.

## Prerequisites

Environment variables (or MCP `.mcp.json` for Trello):

- `TRELLO_API_KEY`
- `TRELLO_TOKEN`
- `TRELLO_BOARD_ID`

Board columns: **Бэклог → Сделать → В работе → Тестирование → Сделано → Архив**  
Agent owns up to «Сделано». «Архив» is human-only.

## Access Trello

**Option A — MCP** (if `mcp__trello__*` tools are available): use them instead of shell.

**Option B — shell** (Git Bash / WSL on Windows):

```bash
bash scripts/trello.sh next-task
bash scripts/trello.sh move <card-id> "<column>"
bash scripts/trello.sh comment <card-id> "<text>"
```

Full API: `docs/agents/TRELLO.md`.

## Workflow

Copy and track:

```
- [ ] 1. next-task from «Сделать» (stop if empty)
- [ ] 2. move → «В работе»
- [ ] 3. implement + tests (ask if ambiguous)
- [ ] 4. move → «Тестирование»
- [ ] 5. quality gate (skill quality-gate or steps below)
- [ ] 6. move → «Сделано» + Trello comment
- [ ] 7. short user report
```

### Step 5 — validations

For each touched package (`backend` / `frontend`):

1. Lint — `npm run lint` only if script exists (this repo: **none** — state explicitly).
2. Tests — `npm test` (backend) or `npm run test:e2e` (frontend).
3. Build — `npm run build` when compilation is not covered by tests.

Max **3** fix cycles per blocker, then escalate per `ESCALATION-MATRIX.md`.

### Step 6 — Trello comment template

```
Done.
Changed: <files/areas>
Checks: <commands> → pass|fail
Risks: <none or bullets>
```

## Rules

- Do **not** commit unless the user explicitly asks.
- Ask before major refactors.
- Derive acceptance criteria from card `desc` and `checklists`.
