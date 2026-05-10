# Codex Adapter

Use this document to apply the shared playbook in Codex-based workflows.

## Source of truth

Always follow:

1. `docs/agents/COMMON-QUALITY-CONTRACT.md`
2. `docs/agents/WORKFLOWS.md`
3. `docs/agents/ESCALATION-MATRIX.md`

## Codex-specific guidance

- Keep changes scoped to the user request and avoid speculative refactors.
- Prefer explicit verification reporting over assumptions.
- If a required validation cannot run, explain exactly why and list what was run instead.

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
