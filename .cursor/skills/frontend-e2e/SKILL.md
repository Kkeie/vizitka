---
name: frontend-e2e
description: >-
  Writes or fixes Playwright end-to-end tests in frontend/e2e. Use when adding
  UI regression tests, fixing flaky e2e, or validating editor/public/auth flows
  in the browser.
---

# Frontend E2E (Playwright)

Specs: `frontend/e2e/ui-test-cases.spec.ts`, `visual-capture.spec.ts`.  
Config: `frontend/playwright.config.ts` (starts backend build + Vite).

## Run

```bash
cd frontend && npm run test:e2e
cd frontend && npm run test:e2e:ui   # debug UI
```

Single file:

```bash
cd frontend && npx playwright test e2e/ui-test-cases.spec.ts
```

## Guidelines

1. Prefer stable selectors: `data-testid`, roles, visible text — avoid brittle CSS chains.
2. Auth flows: use API helpers or test user patterns already in specs.
3. Grid/DnD: minimal steps; assert outcome state, not animation frames.
4. Screenshots dir `frontend/e2e/screenshots/` is gitignored (manual captures).

## After changes

Always `npm run test:e2e` for touched specs; `npm run build` if imports/types changed.

Pair with **quality-gate** for full report.
