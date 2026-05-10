# Cursor Adapter

Use this document to apply the shared playbook in Cursor.

## Source of truth

Always follow:

1. `docs/agents/COMMON-QUALITY-CONTRACT.md`
2. `docs/agents/WORKFLOWS.md`
3. `docs/agents/ESCALATION-MATRIX.md`

## Cursor-specific guidance

- Keep progress updates short and frequent during long tasks.
- After substantial edits, check lints/diagnostics for changed files.
- If a requested check is not configured in scripts, state it explicitly and run the remaining required checks.

## Recommended prompt preface

For non-trivial tasks, prepend:

`Follow docs/agents/COMMON-QUALITY-CONTRACT.md and docs/agents/WORKFLOWS.md. Use escalation rules from docs/agents/ESCALATION-MATRIX.md.`

## Repository command map

### Frontend (`frontend/`)

- build: `npm run build`
- tests: `npm run test:e2e` (end-to-end)
- lint: not currently defined in package scripts

### Backend (`backend/`)

- test: `npm run test`
- build: `npm run build`
- lint: not currently defined in package scripts
