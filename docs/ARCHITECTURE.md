# Architecture

## Overview

"Визитка" — Node.js/Express backend + React/Vite frontend. Backend отдаёт REST API; frontend — SPA, вызывает его. В продакшне frontend раздаётся как статика с CDN или отдельного хоста; в локальной разработке Vite проксирует `/api` на backend.

```
Browser
  → Vite dev server (:5173)  [dev only]
    → proxy /api, /uploads → Express (:3000)
  → Express (:3000)
    → SQLite (better-sqlite3)
    → /uploads (static files)
```

---

## Backend (`backend/src/`)

### Точки входа

| Файл | Роль |
|---|---|
| `server.ts` | Создаёт HTTP-сервер, вызывает `initDatabase()`, запускает на `PORT` |
| `app.ts` | Express: CORS, JSON body parser, static `/uploads`, монтирует все роуты |

### Роуты

Все под `/api/*` в `app.ts`.

| Файл | Префикс | Назначение |
|---|---|---|
| `routes/auth.ts` | `/api/auth` | Регистрация, логин, смена пароля, проверка username/email |
| `routes/profile.ts` | `/api/profile` | Профиль текущего пользователя (чтение/запись) |
| `routes/blocks.ts` | `/api/blocks` | CRUD блоков + переупорядочивание |
| `routes/public.ts` | `/api/public` | Публичный профиль + счётчик просмотров |
| `routes/uploads.ts` | `/api/storage` | Загрузка файлов (multipart) |
| `routes/user.ts` | `/api/user` | Данные текущего пользователя |
| `routes/users.ts` | `/api/users` | Управление пользователями |
| `routes/qr.ts` | `/api/qr` | Генерация QR-кода (PNG) |
| `routes/stats.ts` | `/api/stats` | Дневной счётчик просмотров |
| `routes/metadata.ts` | `/api/metadata` | Метаданные ссылок (og:*, VK, Instagram) |

### База данных

`utils/db.ts` — единственное соединение `better-sqlite3`. Схема создаётся через `initDatabase()` при старте. Миграции — `try/catch ALTER TABLE` (без migration runner). Prisma не используется (`prisma/` — неактивный legacy).

Связи: `User → Profile` (1:1), `User → Block[]` (1:many), `User → daily_views[]` (1:many).

Полная схема: [`docs/generated/db-schema.md`](generated/db-schema.md)

### Auth middleware

`utils/auth.ts` — JWT sign/verify. Middleware `requireAuth` валидирует `Authorization: Bearer <token>` и прикрепляет `req.user`. Токен инвалидируется при смене пароля: `passwordHash` из payload сравнивается с БД на каждом запросе.

---

## Frontend (`frontend/src/`)

### Точка входа

`main.tsx` — монтирует `Shell`, который владеет JWT-состоянием и оборачивает всё в `SessionContext`.

### Управление состоянием

Без Redux/Zustand. JWT хранится в `localStorage`. `subscribeAuthToken` — реактивный хелпер для синхронизации между вкладками. `SessionContext` отдаёт `{ user, authReady, setUser }` всем компонентам.

### Страницы

| Файл | Роут | Назначение |
|---|---|---|
| `pages/Editor.tsx` | `/editor` | Авторизованный. CRUD блоков, drag-and-drop, resize, редактирование профиля |
| `pages/Public.tsx` | `/:username` | Без авторизации. Read-only профиль |

### Ключевые компоненты

| Компонент | Назначение |
|---|---|
| `BlockCard.tsx` | Рендер одного блока по типу |
| `DraggableBlockCard.tsx` | Обёртка BlockCard для dnd-kit |
| `SortableBlockCard.tsx` | Sortable-вариант для списка редактора |
| `BlockModal.tsx` | Форма добавления блока (все типы) |
| `ImageUploader.tsx` | Загрузка файла с превью и drag-and-drop зоной |
| `ProfileCard.tsx` | Редактируемый заголовок профиля |
| `InlineEditCard.tsx` | Inline-редактирование для note/section |
| `NoteFloatingToolbar.tsx` | Плавающий тулбар стилей для note-блоков |
| `Navbar.tsx` | Верхняя навигация |
| `Avatar.tsx` | Аватар с поддержкой загрузки |

### API-слой

`api.ts` — все HTTP-вызовы, экспортирует типы `User`, `Block`, `Profile`. Единственный источник правды для форм запросов.

### Типы

`types.ts` — `Block`, `Profile`, `Layout`, `BlockSizes`, `BlockGridSize`, `BlockGridAnchor`.

---

## Поток данных

```
Действие пользователя
  → обработчик в компоненте
  → функция в api.ts (fetch к /api/*)
  → Express route handler
  → запрос к db.ts
  → JSON-ответ
  → обновление React state
  → ре-рендер
```

---

## Деплой

Варианты деплоя и инфраструктура: [`docs/references/deploy/`](references/deploy/)
