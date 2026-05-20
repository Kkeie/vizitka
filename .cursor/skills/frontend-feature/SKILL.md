---
name: frontend-feature
description: >-
  Adds or changes React UI, pages, components, api.ts client calls, and styles
  for the Визитка frontend. Use when editing frontend/src/pages, components,
  api.ts, main.tsx, or sessionContext.tsx.
---

# Frontend Feature

Spec: `docs/agents/SPEC.md`. Commands: `AGENTS.md`.

## Key files

| Area | Path |
|------|------|
| API client | `frontend/src/api.ts` |
| Types | `frontend/src/types.ts` |
| Editor page | `frontend/src/pages/Editor.tsx` |
| Public page | `frontend/src/pages/Public.tsx` |
| Auth shell | `frontend/src/main.tsx`, `sessionContext.tsx` |
| Block render | `frontend/src/components/BlockCard.tsx` |
| DnD wrapper | `frontend/src/components/DraggableBlockCard.tsx` |

## Checklist

```
- [ ] Types match backend responses (api.ts)
- [ ] Reuse existing components; match local CSS patterns
- [ ] Grid changes → use skill bento-grid
- [ ] cd frontend && npm run build
- [ ] UI flows touched → npm run test:e2e
```

## Dev

Vite on `:5173`, proxies `/api` and `/uploads` to backend `:3000`.

## Rules

- Do not commit unless user asks.
- Ask before large Editor.tsx refactors.
