---
name: editor-page
description: >-
  Changes the authenticated editor page — block CRUD, drag reorder, profile card,
  QR, view counter, modals. Use when editing frontend/src/pages/Editor.tsx or
  editor-only components (DraggableBlockCard, BlockModal, ProfileCard in editor
  context). Prefer bento-grid skill for pure layout math.
---

# Editor Page

`Editor.tsx` is large (~1800 lines). **Read targeted sections** before editing; do not rewrite the whole file.

## Related files

| Concern | Path |
|---------|------|
| Page | `frontend/src/pages/Editor.tsx` |
| Block UI | `BlockCard.tsx`, `DraggableBlockCard.tsx`, `SortableBlockCard.tsx` |
| Grid shell | `BlockMasonryGrid.tsx` |
| Add blocks | `AddBlockButtons.tsx`, `AddBlockGrid.tsx`, `BlockModal.tsx` |
| Profile header | `ProfileCard.tsx`, `ImageUploader.tsx` |
| Grid engine | `lib/block-grid.ts` → skill **bento-grid** |
| API | `api.ts` — blocks + profile endpoints |

## Rules

1. Layout/resize bugs → fix in `block-grid.ts` when possible, not duplicated in Editor.
2. New block type → skill **block-types** + backend `routes/blocks.ts`.
3. Persist layout via existing profile PATCH (blockSizes + layout).

## Validation

```bash
cd frontend && npm run build
```

UI/DnD/save flows changed:

```bash
cd frontend && npm run test:e2e
```

Backend block API touched:

```bash
cd backend && npm test
```
