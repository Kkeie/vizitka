---
name: block-types
description: >-
  Adds or modifies block types (note, link, photo, video, music, map, social,
  section), BlockCard rendering, validation, and default grid sizes. Use when
  introducing a new block type or changing block fields/validation.
---

# Block Types

Spec table: `docs/agents/SPEC.md` § Block types.

## Touch points

| Layer | Path |
|-------|------|
| API validation | `backend/src/routes/blocks.ts` |
| DB Block row | `backend/src/utils/db.ts` |
| Types | `frontend/src/types.ts`, `api.ts` |
| Render | `frontend/src/components/BlockCard.tsx` |
| Add UI | `AddBlockButtons.tsx`, `BlockModal.tsx` |
| Default sizes | `frontend/src/lib/block-grid.ts` |

## New type checklist

```
- [ ] SPEC.md block table updated (if team wants docs in sync)
- [ ] Backend: create/update validation + tests in blocks*.integration.test.ts
- [ ] Frontend: BlockCard branch + editor form
- [ ] Default colSpan/rowSpan in block-grid defaults
- [ ] quality-gate both packages
```

Social URLs: platform list in SPEC — normalize like existing `social` blocks.
