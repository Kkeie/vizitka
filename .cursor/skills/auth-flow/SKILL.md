---
name: auth-flow
description: >-
  Implements or fixes registration, login, JWT session, username/email checks,
  password change, and onboarding wizard. Use when editing auth routes, JWT
  middleware, AuthBar, onboarding components, or username validation.
---

# Auth Flow

Spec: `docs/agents/SPEC.md` (Registration, Auth API).

## Backend

| File | Role |
|------|------|
| `backend/src/routes/auth.ts` | register, login, check-username, check-email, change-password |
| `backend/src/utils/auth.ts` | JWT sign/verify, `requireAuth` |
| `backend/test/auth*.integration.test.ts` | tests |

Rules: username latin/digit/underscore min 3; password min 4; `username_taken` + suggestions on conflict.

## Frontend

| File | Role |
|------|------|
| `frontend/src/main.tsx` | token storage, `subscribeAuthToken` |
| `frontend/src/sessionContext.tsx` | session context |
| `frontend/src/components/AuthBar.tsx` | login UI |
| `frontend/src/components/onboarding/*` | wizard after register |

Env: `JWT_SECRET` on backend only.

## Validation

```bash
cd backend && npx vitest run test/auth.integration.test.ts
cd backend && npm test
cd frontend && npm run build
```

If onboarding UI changed: `npm run test:e2e`.
