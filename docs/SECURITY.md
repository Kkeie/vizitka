# Security

## Аутентификация

JWT-токены подписываются через `JWT_SECRET` (обязательный env). Payload: `{ id, username, userCreatedAt, passwordHash }`.

**Инвалидация токена:** `passwordHash` из payload сравнивается с БД на каждом авторизованном запросе. Смена пароля аннулирует все активные сессии.

Пароли хешируются `bcryptjs`.

JWT хранится в `localStorage` браузера (не в cookie → нет CSRF-риска, но уязвим к XSS).

---

## Авторизация

Все приватные эндпойнты требуют `Authorization: Bearer <token>`. Middleware `requireAuth` (`utils/auth.ts`) валидирует токен и прикрепляет `req.user` к запросу.

Приватные ответы: `Cache-Control: private, no-store`.

---

## Зарезервированные username

Эти имена нельзя зарегистрировать:

```
login, register, editor, u, api,
index.html, 404.html, index, public,
favicon.ico, robots.txt
```

---

## Загрузка файлов

- MIME-тип проверяется из буфера файла, **не** из `Content-Type` заголовка (защита от spoofing).
- Максимальный размер: **50 MB**.
- Разрешённые типы: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/ogg`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/mp4`.
- Файлы раздаются как статика через `/uploads/*` без проверки авторизации — URL загруженного файла является публичным.

---

## CORS

Настраивается в `app.ts`. Разрешённые origins — через `FRONTEND_URL` (comma-separated список). В продакшне строгий, в разработке разрешительный.

---

## Валидация входных данных

| Поле | Правило |
|---|---|
| `linkUrl` | Только http/https, публичный хост |
| `socialUrl` | Нормализация и валидация под каждую платформу (`lib/blockValidation.ts`) |
| `mapLat` / `mapLng` | lat ∈ [-90, 90], lng ∈ [-180, 180] |
| `username` | Только latin, цифры, underscore; мин. 3 символа; не в reserved list |
| `password` | Мин. 4 символа |
| `photoUrl` | `/uploads/...` путь или http/https URL |

---

## Известные пробелы

| Пробел | Риск |
|---|---|
| Нет rate limiting на auth-эндпойнты | Brute-force атаки на пароли |
| Нет CSRF-защиты | Низкий (token-only, нет cookies) |
| Upload-файлы публично доступны по URL | Нет защиты приватного контента |
| JWT в localStorage | XSS может украсть токен |
