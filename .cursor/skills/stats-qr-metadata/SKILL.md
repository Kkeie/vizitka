---
name: stats-qr-metadata
description: >-
  Implements view counters, QR code generation, link preview metadata (OG tags),
  or public page SEO. Use when editing routes/stats.ts, routes/qr.ts,
  routes/metadata.ts, or editor QR/view counter UI.
---

# Stats, QR, Metadata

Spec: `docs/agents/SPEC.md` (stats, public page).

## Files

| Feature | Backend | Frontend |
|---------|---------|----------|
| Daily views | `routes/stats.ts`, `daily_views` table | Editor counter display |
| QR | `routes/qr.ts` | Editor QR section |
| Metadata | `routes/metadata.ts` | public HTML/meta if any |

Timezone for views: **Ekaterinburg UTC+5** per spec.

## Tests

```bash
cd backend && npx vitest run test/metadata-qr-system.integration.test.ts
cd backend && npm test
```

## Validation

```bash
cd frontend && npm run build
```

Public rendering changed → `npm run test:e2e`.
