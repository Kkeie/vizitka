---
name: code-review
description: >-
  Reviews diffs for correctness, security, tests, and alignment with
  COMMON-QUALITY-CONTRACT and SPEC. Use when the user asks for code review,
  PR review, or pre-merge check without implementing changes.
---

# Code Review

Policies: `docs/agents/COMMON-QUALITY-CONTRACT.md`, `docs/agents/SPEC.md`.

## Checklist

- [ ] Matches user/task acceptance criteria
- [ ] Scope minimal — no drive-by refactors
- [ ] New logic has tests (backend integration / frontend e2e)
- [ ] Auth: no token leaks, `requireAuth` on private routes
- [ ] Inputs validated (URLs, social platforms, uploads)
- [ ] Grid: editor/public consistency if layout touched
- [ ] No secrets in diff

## Output format

```markdown
## Summary
<1-2 sentences>

## Critical (must fix)
- ...

## Suggestions
- ...

## Verified
- tests: <commands if run>
```

Read-only unless user asks to apply fixes. Fixes → **bugfix** skill.
