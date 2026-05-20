---
name: backend-feature
description: >-
  Adds or changes Express API routes, SQLite schema/migrations, auth, or backend
  integration tests for the Визитка project. Use when editing backend/src/routes,
  backend/src/utils/db.ts, backend/src/utils/auth.ts, or backend/test/*.integration.test.ts.
---

# Backend Feature

Architecture: `AGENTS.md` (backend section). API details: `docs/agents/SPEC.md`.

## Stack

- Express routes in `backend/src/routes/`
- SQLite via **better-sqlite3** in `backend/src/utils/db.ts` (no Prisma)
- JWT: `backend/src/utils/auth.ts` — `requireAuth` on protected routes
- Tests: Vitest integration tests in `backend/test/`, real DB in `/tmp` per `test/setup.ts`

## Checklist

```
- [ ] Route mounted in backend/src/app.ts if new file
- [ ] Types aligned with frontend/src/api.ts consumers
- [ ] SQL: schema in db.ts init + inline ALTER if migrating
- [ ] New logic covered in backend/test/<area>.integration.test.ts
- [ ] npm test && npm run build in backend/
```

## Test patterns

- Use helpers from `backend/test/helpers.ts`.
- Tests are **not** parallel — do not enable file parallelism.
- Example single file: `npx vitest run test/auth.integration.test.ts`

## Common paths

| Task | Start here |
|------|------------|
| Auth/register/login | `routes/auth.ts`, `test/auth*.integration.test.ts` |
| Blocks CRUD | `routes/blocks.ts`, `test/blocks*.integration.test.ts` |
| Profile/layout | `routes/profile.ts`, `test/profile*.integration.test.ts` |
| Public read | `routes/public.ts`, `test/public*.integration.test.ts` |
| Uploads | `routes/uploads.ts`, `UPLOAD_DIR` env |

## Rules

- Validate inputs; return consistent `{ error: "code" }` shapes per existing routes.
- Never log or commit secrets (`JWT_SECRET`, tokens).
- Do not commit unless the user asks.
