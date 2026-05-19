# Database Schema

Генерируется из `backend/src/utils/db.ts`. SQLite через `better-sqlite3`.

> Файл отражает актуальное состояние схемы включая миграции. При изменении `db.ts` — обновить этот файл.

---

## Таблицы

### User

| Колонка | Тип | Ограничения | Примечание |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `email` | TEXT | NOT NULL | Case-insensitive в запросах |
| `passwordHash` | TEXT | NOT NULL | bcryptjs hash |
| `createdAt` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| `emailVerified` | INTEGER | — | Миграция; 1 = подтверждён |
| `emailVerifyTokenHash` | TEXT | — | Миграция |
| `emailVerifyExpiresAt` | TEXT | — | Миграция |
| `emailVerifySentAt` | TEXT | — | Миграция |

---

### Profile

| Колонка | Тип | Ограничения | Примечание |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `userId` | INTEGER | FK → User, UNIQUE | 1:1 с User |
| `username` | TEXT | UNIQUE | Lowercase, latin/цифры/underscore |
| `name` | TEXT | — | Отображаемое имя |
| `bio` | TEXT | — | |
| `avatarUrl` | TEXT | — | |
| `backgroundUrl` | TEXT | — | |
| `phone` | TEXT | — | |
| `email` | TEXT | — | Публичный контактный email (≠ auth email) |
| `telegram` | TEXT | — | |
| `layout` | TEXT | — | JSON: `{ mobile, tablet, desktop: number[][] }` |
| `blockSizes` | TEXT | — | JSON: `Record<blockId, BlockGridSize>` |

---

### Block

| Колонка | Тип | Ограничения | Примечание |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `userId` | INTEGER | FK → User | 1:many с User |
| `type` | TEXT | NOT NULL | `section`, `note`, `link`, `photo`, `video`, `music`, `map`, `social` |
| `sort` | INTEGER | — | Индекс порядка |
| `note` | TEXT | — | Текст (типы note, section) |
| `noteStyle` | TEXT | — | JSON стилей (только тип note) |
| `linkUrl` | TEXT | — | |
| `photoUrl` | TEXT | — | Путь `/uploads/...` или http/https URL |
| `videoUrl` | TEXT | — | YouTube или VK Video URL |
| `musicEmbed` | TEXT | — | URL Yandex Music или raw iframe |
| `mapLat` | REAL | — | |
| `mapLng` | REAL | — | |
| `socialType` | TEXT | — | Идентификатор платформы |
| `socialUrl` | TEXT | — | Нормализованный полный URL |
| `createdAt` | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| `updatedAt` | DATETIME | — | Обновляется через триггер |

---

### daily_views

| Колонка | Тип | Примечание |
|---|---|---|
| `user_id` | INTEGER | FK → User |
| `view_date` | TEXT | `YYYY-MM-DD`, Екатеринбург (UTC+5) |
| `count` | INTEGER | Upsert при каждом визите публичной страницы |

Primary key: `(user_id, view_date)`.

---

## Стратегия миграций

Без migration runner. Новые колонки добавляются через `try/catch ALTER TABLE` в `initDatabase()`. Если колонка уже существует — ошибка молча игнорируется.

---

## Пути к БД

| Среда | Путь |
|---|---|
| `DATABASE_PATH` env задан | значение переменной |
| Production без Docker | `/tmp/bento-db.sqlite` |
| Docker / локально | `./data/db.sqlite` |
