---
name: bugfix
description: >-
  Fixes bugs with reproduction, root-cause analysis, regression test, and
  quality gate. Use when the user reports a defect, regression, or broken
  behavior in editor, public page, API, or uploads.
---

# Bugfix

Workflow: `docs/agents/WORKFLOWS.md` § Bugfix. Contract: `COMMON-QUALITY-CONTRACT.md`.

## Steps

```
- [ ] 1. Reproduce (steps, env, expected vs actual)
- [ ] 2. Root cause hypothesis (file/function)
- [ ] 3. Failing regression test (backend integration or frontend e2e)
- [ ] 4. Smallest fix
- [ ] 5. Test green + quality-gate on touched packages
- [ ] 6. Report: cause, fix scope, confidence
```

## Route to domain skills

| Symptom area | Skill |
|--------------|-------|
| Grid/layout/DnD | bento-grid |
| API/DB/auth | backend-feature |
| UI only | frontend-feature |
| Browser flow | frontend-e2e |

## Subagents

- **explore** — trace call chain before editing
- **shell** — run targeted `npx vitest run test/...` or playwright file

Max 3 fix cycles → `ESCALATION-MATRIX.md`.
