---
name: spec-check
description: >-
  Verifies implementation against docs/agents/SPEC.md — user flows, block
  validation rules, grid defaults, API shapes. Use before closing a Trello card,
  after a feature, or when asked "соответствует ли спеке".
---

# Spec Check

Read `docs/agents/SPEC.md` fully for the touched area.

## Report template

```markdown
## Spec check: <feature/area>

### Matches spec
- ...

### Gaps / deviations
- ... (file:line if known)

### Untested in spec but implemented
- ...

### Recommended follow-up
- ...
```

## Focus areas by change

| If you changed | Re-read SPEC section |
|----------------|----------------------|
| Blocks | Block types table, validation |
| Grid | Bento grid system, default sizes |
| Auth | Registration, Auth API |
| Public URL | Public page, daily_views timezone |
| Uploads | photo URL rules |

Read-only review — no code unless user asked to fix gaps.

After fixes, run skill **quality-gate**.
