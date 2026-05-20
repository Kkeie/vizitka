---
name: quality-gate
description: >-
  Runs required validations for the Визитка monorepo after code changes — backend
  Vitest, frontend Playwright e2e, and TypeScript builds. Use after implementing
  features or fixes, before marking a Trello card done, or when the user asks to
  verify, test, or check that changes are green.
---

# Quality Gate

Contract: `docs/agents/COMMON-QUALITY-CONTRACT.md`.

## Lint

Neither package defines `npm run lint`. **Report explicitly** that lint is unavailable; do not skip test + build.

## Which commands to run

| Changed area | Commands (in order) |
|--------------|---------------------|
| `backend/**` | `cd backend && npm test` then `npm run build` |
| `frontend/**` (no grid-only logic) | `cd frontend && npm run build`; add `npm run test:e2e` if UI/routing/auth flows touched |
| `frontend/**` grid/layout | `npm run build` + targeted unit tests if added; e2e if drag/resize/public layout behavior changed |
| Both | Run backend block, then frontend block |

Single test file (backend):

```bash
cd backend && npx vitest run test/auth.integration.test.ts
```

E2e (starts backend + Vite automatically):

```bash
cd frontend && npm run test:e2e
```

## Reporting

Always report **exact commands** and **pass/fail**, not assumptions.

```markdown
## Quality gate
- backend: `npm test` → pass (N tests)
- backend: `npm run build` → pass
- frontend: `npm run build` → pass
- lint: not configured
- risks: ...
```

## Failure loop

1. Read full error output.
2. Smallest fix scoped to the failure.
3. Re-run the **failed** command first, then full gate for touched packages.
4. After **3** failed attempts on the same blocker → `docs/agents/ESCALATION-MATRIX.md`.

## Subagents

- Use **shell** subagent for long test runs in parallel with other work (`docs/agents/SUBAGENTS.md`).
- Use **ci-investigator** when fixing GitHub Actions deploy/terraform failures.
