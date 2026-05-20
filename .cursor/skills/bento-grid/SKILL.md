---
name: bento-grid
description: >-
  Implements or fixes bento grid layout, block resize, drag-and-drop placement,
  breakpoints (mobile/tablet/desktop), blockSizes and layout JSON on Profile.
  Use when editing block-grid.ts, Editor grid, Public page layout, Profile
  blockSizes/layout fields, or drag/resize/snap behavior.
---

# Bento Grid

Product rules: `docs/agents/SPEC.md` (grid + block types).

## Key files

| Layer | Path |
|-------|------|
| Grid engine | `frontend/src/lib/block-grid.ts` |
| Types | `frontend/src/types.ts` — `Layout`, `BlockSizes`, `BlockGridSize`, `BlockGridAnchor` |
| Editor UI | `frontend/src/pages/Editor.tsx` |
| Public view | `frontend/src/pages/Public.tsx` |
| Persistence | `backend/src/routes/profile.ts`, `Profile.blockSizes` / `Profile.layout` (JSON in SQLite) |

## Model (short)

- Columns: **2** on mobile/tablet, **4** on desktop (`GRID_COLUMNS` in `block-grid.ts`).
- Micro-rows: `BENTO_ROW_UNIT = 8` per cell row.
- `Profile.blockSizes`: `Record<blockId, { colSpan, rowSpan, anchorsByBreakpoint? }>`.
- `Profile.layout`: `{ mobile, tablet, desktop: number[][] }` sparse placement matrices.
- Breakpoints: `mobile | tablet | desktop`.

## Implementation rules

1. Prefer extending existing helpers in `block-grid.ts` over duplicating placement math in components.
2. Any change to placement, overlap resolution, or clamping → add/update tests (new file under `frontend/src/lib/` if needed, or extend existing tests if present).
3. Keep editor and public rendering consistent — if Editor computes placement, Public must use the same engine path.
4. API: profile PATCH must remain backward-compatible with existing stored JSON (migrations only in `backend/src/utils/db.ts` if schema shape changes).

## Manual check

After logic changes:

1. `cd frontend && npm run build`
2. If DnD/resize/public layout changed: `npm run test:e2e`
3. If profile save API changed: `cd backend && npm test` (profile/blocks tests)

## Escalate

- Changing column counts or breakpoint semantics (product decision).
- Data migration affecting live profiles without explicit user approval.
