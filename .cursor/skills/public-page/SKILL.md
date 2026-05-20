---
name: public-page
description: >-
  Changes read-only public profile at /:username, view counting, public routes,
  and Public.tsx rendering. Use for public page bugs, SEO meta, QR link display,
  or daily_views behavior.
---

# Public Page

Routes: `/:username`, `/u/:username`, `/public/:username` (frontend router).  
Backend: `backend/src/routes/public.ts`, view counter `daily_views` (Ekaterinburg TZ).

## Files

- `frontend/src/pages/Public.tsx`
- `backend/src/routes/public.ts`
- `backend/test/public*.integration.test.ts`
- Grid read-only: same engine as editor via `block-grid.ts` + `BlockCard`

## Checklist

```
- [ ] Unauthenticated access only public fields
- [ ] View increment once per visit semantics preserved
- [ ] Layout matches editor for same profile data
- [ ] backend npm test (public tests)
- [ ] frontend build; e2e if routing/render changed
```

Grid placement issues → **bento-grid**.
