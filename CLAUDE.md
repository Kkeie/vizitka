# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Documentation

| Документ | Содержание |
|---|---|
| `docs/ARCHITECTURE.md` | Полная архитектура backend + frontend |
| `docs/FRONTEND.md` | Компоненты, state, grid engine, паттерны |
| `docs/SECURITY.md` | Auth, JWT, валидация, известные пробелы |
| `docs/TESTING.md` | Как запускать тесты, структура тест-файлов |
| `docs/product-specs/` | Продуктовые спеки: user flows, типы блоков, API |
| `docs/design-docs/` | Дизайн-решения: принципы, bento-grid движок |
| `docs/generated/db-schema.md` | Схема БД с миграциями |
| `docs/agents/SPEC.md` | Полная спека (legacy, для обратной совместимости) |

## Architecture (краткая версия)

**Backend:** Express + better-sqlite3. Роуты: `auth`, `profile`, `blocks`, `public`, `uploads`, `qr`, `stats`, `metadata`. Auth через JWT (`utils/auth.ts`). Нет Prisma.

**Frontend:** React 18 + Vite. JWT в localStorage. `SessionContext` для auth state. `pages/Editor.tsx` — редактор, `pages/Public.tsx` — публичный вид. Grid engine: `lib/block-grid.ts`.

**DB:** `User → Profile` (1:1), `User → Block[]` (1:many), `daily_views`. Подробно: `docs/generated/db-schema.md`.

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `JWT_SECRET` | backend | required, sign/verify tokens |
| `FRONTEND_URL` | backend | comma-separated allowed CORS origins |
| `DATABASE_PATH` | backend | SQLite path (default: `./data/db.sqlite`) |
| `UPLOAD_DIR` | backend | uploads directory (default: `./uploads`) |
| `DOCKER` | backend | set to `"1"` in Docker to skip Render-specific paths |
| `VITE_BACKEND_URL` | frontend dev | proxy target (default: `http://localhost:3000`) |
| `VITE_BACKEND_API_URL` | frontend build | production API base URL |
| `VK_API_TOKEN` | backend | optional — VK service token for `/api/metadata` |
| `META_APP_TOKEN` | backend | optional — Meta App token for Instagram oEmbed |

## Testing

Backend: vitest, реальная SQLite в `/tmp`. `npm test`. Один файл: `npx vitest run test/auth.integration.test.ts`.

Frontend e2e: Playwright. `npm run test:e2e`. Автоматически запускает backend + Vite.

Подробно: `docs/TESTING.md`

## Task tracker (Trello)

Full spec: `docs/agents/TRELLO.md`

Board columns: **Бэклог → Сделать → В работе → Тестирование → Сделано → Архив**

- Agent picks tasks from «Сделать», moves the card forward as work progresses, and leaves it in «Сделано».
- «Архив» is moved by a human.
- Use `/do-task` to start the automated workflow.

MCP server config: `.mcp.json` (gitignored; copy from `.mcp.json.example` and fill in `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`).

## Agent policy

See `docs/agents/COMMON-QUALITY-CONTRACT.md` for the full contract. Key rules:
- Ask before major refactors.
- Add/update tests for all new logic.
- After changes: run tests, then build. Report results — pass/fail, not "should be fine".
- Do not commit unless explicitly asked.
