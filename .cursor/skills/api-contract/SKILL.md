---
name: api-contract
description: >-
  Keeps frontend api.ts and backend Express routes in sync — types, paths,
  request/response shapes, error codes. Use when adding an API endpoint,
  changing response JSON, or fixing client/server mismatch bugs.
---

# API Contract

Source of truth for behavior: `docs/agents/SPEC.md` (API reference).

## Checklist

```
- [ ] Route in backend/src/routes/*.ts mounted in app.ts
- [ ] Matching function/types in frontend/src/api.ts
- [ ] Error codes match existing patterns ({ error: "code" })
- [ ] Auth: requireAuth on private routes
- [ ] Integration test in backend/test/
- [ ] frontend npm run build
```

## File pairs (common)

| API area | Backend | Frontend |
|----------|---------|----------|
| Auth | `routes/auth.ts` | `api.ts` register/login/check-* |
| Profile | `routes/profile.ts` | getProfile, patchProfile |
| Blocks | `routes/blocks.ts` | block CRUD helpers |
| Public | `routes/public.ts` | public profile fetch |
| Uploads | `routes/uploads.ts` | upload helpers |

## Validation

```bash
cd backend && npm test
cd frontend && npm run build
```

If only types changed on frontend, build may suffice; if route logic changed, always run backend tests.
