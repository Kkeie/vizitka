---
name: auth-onboarding
description: >-
  Implements or fixes only the post-registration onboarding wizard UI in
  frontend/src/components/onboarding. Use for Step1Username, Step2Account,
  OnboardingWizard, OnboardingInEditor, CongratsStep — not for login API or JWT
  (use auth-flow skill instead).
---

# Auth Onboarding (UI only)

Spec: `docs/agents/SPEC.md` (Registration flow — wizard after register).

## Files

- `frontend/src/components/onboarding/OnboardingWizard.tsx`
- `OnboardingInEditor.tsx`, `Step1Username.tsx`, `Step2Account.tsx`
- `CongratsStep.tsx`, `PhoneMockup.tsx`, `FloatingCards.tsx`
- Wired from `frontend/src/pages/Editor.tsx`

Login/register API → skill **auth-flow**.

## Validation

```bash
cd frontend && npm run build
cd frontend && npm run test:e2e
```

If username check API touched → `cd backend && npx vitest run test/auth.integration.test.ts`.
