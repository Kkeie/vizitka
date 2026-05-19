# API Reference

Все приватные эндпойнты требуют `Authorization: Bearer <token>`.  
Base path: `/api`

---

## Auth

| Метод | Путь | Auth | Body | Ответ |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ username, email, password }` | `{ token, user }` |
| POST | `/auth/login` | — | `{ email, password }` | `{ token, user }` |
| POST | `/auth/check-username` | — | `{ username }` | `{ available, suggestions }` |
| POST | `/auth/check-email` | — | `{ email }` | `{ available }` |
| POST | `/auth/change-password` | ✓ | `{ currentPassword, newPassword }` | `{ ok, token }` |

---

## Profile

| Метод | Путь | Auth | Примечание |
|---|---|---|---|
| GET | `/profile` | ✓ | Возвращает свой профиль; создаёт автоматически если отсутствует |
| PATCH | `/profile` | ✓ | Частичное обновление: любое поле профиля |

---

## Blocks

| Метод | Путь | Auth | Примечание |
|---|---|---|---|
| GET | `/blocks` | ✓ | Свои блоки, отсортированные по `sort ASC` |
| POST | `/blocks` | ✓ | `{ type, ...fields }` |
| PATCH | `/blocks/:id` | ✓ | Частичное обновление |
| DELETE | `/blocks/:id` | ✓ | |
| POST | `/blocks/reorder` | ✓ | `{ items: [{ id, sort }] }` |

---

## Public

| Метод | Путь | Auth | Примечание |
|---|---|---|---|
| GET | `/public/:username` | — | Возвращает `{ name, bio, avatarUrl, backgroundUrl, phone, email, telegram, blocks, layout, blockSizes }`. Инкрементирует дневной счётчик просмотров. |

---

## File Upload

Все эндпойнты: `POST`, требуют auth, `multipart/form-data`, любое имя поля.

| Путь | Примечание |
|---|---|
| `/storage/upload` | Общий |
| `/storage/image` | Тот же обработчик |
| `/storage/video` | Тот же обработчик |
| `/storage/audio` | Тот же обработчик |

Разрешённые MIME: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/ogg`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/mp4`.  
Максимум: **50 MB**. MIME проверяется из буфера.  
Ответ: `{ url: "/uploads/<filename>" }`.

---

## Misc

| Метод | Путь | Auth | Примечание |
|---|---|---|---|
| GET | `/qr?url=<url>` | — | PNG QR-код (256×256) |
| GET | `/stats/today` | ✓ | `{ today: <view_count> }` |
| GET | `/health` | — | `{ ok: true }` |
| GET | `/metadata?url=<url>` | — | `{ title, description, image, favicon }` — og-метаданные, VK/Instagram поддержка |

---

## Аутентификация

JWT хранится в `localStorage`. Payload: `{ id, username, userCreatedAt, passwordHash }`.  
Токен инвалидируется при смене пароля (hash из payload сравнивается с БД).  
Приватные ответы: `Cache-Control: private, no-store`.

---

## Зарезервированные usernames

`login`, `register`, `editor`, `u`, `api`, `index.html`, `404.html`, `index`, `public`, `favicon.ico`, `robots.txt`
