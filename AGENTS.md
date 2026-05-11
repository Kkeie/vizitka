# AGENTS.md

This file provides guidance to OpenAI Codex and other AI agents working in this repository.

## Project overview

"Визитка" is a bento-grid personal page builder. Users register, create a public profile, and arrange content blocks (notes, links, photos, videos, maps, social icons, etc.) in a responsive bento grid. Public pages are served at `/:username`.

## Commands

### Backend (`cd backend`)

```bash
npm install
npm run build          # tsc compile to dist/
npm start              # run compiled dist/server.js
npm run dev            # tsc --watch (no auto-restart)
npm test               # vitest run (integration, uses real SQLite in /tmp)
```

Run a single test file: `npx vitest run test/auth.integration.test.ts`

### Frontend (`cd frontend`)

```bash
npm install
npm run dev            # Vite dev server on :5173, proxies /api and /uploads to :3000
npm run build          # tsc + vite build
npm run test:e2e       # Playwright (starts backend + frontend automatically)
npm run test:e2e:ui    # Playwright with UI
```

### Local dev setup

Start backend first (`npm start` in `backend/`), then frontend (`npm run dev` in `frontend/`). Vite auto-proxies `/api` → `http://localhost:3000`. Health check: `http://localhost:3000/api/health`.

No lint script is configured in either package.

## Project specification

Full spec (user flows, API, data models, block types, grid system): `docs/agents/SPEC.md`

## Architecture

### Backend (`backend/src/`)

- `server.ts` — creates HTTP server, calls `initDatabase()`, starts listening
- `app.ts` — Express setup: CORS, JSON parsing, static `/uploads`, all route mounts under `/api/*`
- `utils/db.ts` — single better-sqlite3 connection, schema creation + inline `ALTER TABLE` migrations, exports `User`, `Profile`, `Block` types. **There is no Prisma** (the `prisma/` folder is unused)
- `utils/auth.ts` — JWT sign/verify helpers, `requireAuth` middleware
- `routes/` — one file per resource: `auth`, `user`, `blocks`, `profile`, `public`, `uploads`, `qr`, `stats`, `metadata`

DB schema: `User` (auth) → `Profile` (1:1, public info + layout JSON) and `User` → `Block[]` (1:many, content blocks). `daily_views` tracks per-user page views by date.

### Frontend (`frontend/src/`)

- `main.tsx` — `Shell` component owns JWT auth state, `subscribeAuthToken` reactive helper, wraps the whole app in `SessionContext`
- `sessionContext.tsx` — React context for `{ user, authReady, setUser }`
- `api.ts` — all API calls + re-exported types (`User`, `Block`, `Profile`, etc.)
- `types.ts` — `Block`, `Profile`, `Layout`, `BlockSizes`, `BlockGridSize`, `BlockGridAnchor`
- `pages/Editor.tsx` — main editor: block CRUD, drag-and-drop reorder, grid resize, profile editing
- `pages/Public.tsx` — read-only public profile view
- `components/` — UI building blocks; `BlockCard` renders a single block, `DraggableBlockCard` wraps it for dnd-kit
- `lib/block-grid.ts` — grid engine: 2 columns on mobile/tablet, 4 on desktop (`GRID_COLUMNS`), `BENTO_ROW_UNIT=8` micro-rows per cell, `BlockGridSize` = `{ colSpan, rowSpan, anchorsByBreakpoint? }`

### Block grid system

Block layout is stored as JSON in `Profile.blockSizes` (`BlockSizes = Record<blockId, BlockGridSize>`) and `Profile.layout` (`Layout = { mobile, tablet, desktop: number[][] }`). `block-grid.ts` handles sparse-anchor assignment, overlap resolution, and clamping. Breakpoints: `mobile | tablet | desktop`.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `JWT_SECRET` | backend | required, sign/verify tokens |
| `FRONTEND_URL` | backend | comma-separated allowed CORS origins |
| `DATABASE_PATH` | backend | SQLite path (default: `./data/db.sqlite`) |
| `UPLOAD_DIR` | backend | uploads directory (default: `./uploads`) |
| `DOCKER` | backend | set to `"1"` in Docker to skip Render-specific paths |
| `VITE_BACKEND_URL` | frontend dev | proxy target (default: `http://localhost:3000`) |
| `VITE_BACKEND_API_URL` | frontend build | production API base URL |

### Testing

Backend tests are integration tests against a real SQLite DB created in `/tmp` per process (`test/setup.ts`). Tests are **not** parallel (`fileParallelism: false`, `pool: forks`).

E2e tests (`frontend/e2e/`) use Playwright. `playwright.config.ts` starts the backend (builds it first) and Vite dev server automatically.

## Task tracker (Trello)

Full spec: `docs/agents/TRELLO.md`

Board columns: **Бэклог → Сделать → В работе → Тестирование → Сделано → Архив**

«Архив» is moved by a human only. The agent owns everything up to «Сделано».

### Setup

Trello credentials are required in the environment:

```
TRELLO_API_KEY=...
TRELLO_TOKEN=...
TRELLO_BOARD_ID=...
```

All Trello operations go through `scripts/trello.sh` (requires `curl` and `jq`).

### Task execution workflow

**Step 1 — Read the task**

```bash
bash scripts/trello.sh next-task
```

This returns the first card from «Сделать» as JSON: `id`, `name`, `desc`, `checklists`.
If the list is empty, stop and report to the user.

**Step 2 — Move to «В работе»**

```bash
bash scripts/trello.sh move <card-id> "В работе"
```

**Step 3 — Implement**

- Derive acceptance criteria from the card description and checklists.
- Make the minimum scoped change.
- Add or update tests for all new logic.
- If the task is ambiguous, stop and ask before implementing.

**Step 4 — Move to «Тестирование»**

```bash
bash scripts/trello.sh move <card-id> "Тестирование"
```

**Step 5 — Run quality checks**

For each changed package (`backend` / `frontend`):

1. Lint — `npm run lint` if the script exists; if not, state that explicitly.
2. Tests — `npm test` (backend) or `npm run test:e2e` (frontend).
3. Build — `npm run build` if tests don't cover compilation.

Fix failures and repeat. Maximum 3 fix cycles per blocker before escalating.

**Step 6 — Move to «Сделано» and comment**

All checks green:

```bash
bash scripts/trello.sh move <card-id> "Сделано"
bash scripts/trello.sh comment <card-id> "Done. Changed: ... Checks: ... Risks: ..."
```

**Step 7 — Report to user**

Short summary: what changed, what was validated, residual risks.

## Agent policy

Full contract: `docs/agents/COMMON-QUALITY-CONTRACT.md`. Workflows: `docs/agents/WORKFLOWS.md`.

- Ask before major refactors.
- Add/update tests for all new logic.
- After changes: run tests, then build. Report exact commands and results.
- Do not commit unless explicitly asked.
- Limit to 3 fix-attempt cycles per blocker before escalating.
