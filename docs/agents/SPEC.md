# Project Specification

## Product

"Визитка" is a personal profile page builder. A user registers, gets a public URL at `/:username`, and arranges content blocks in a responsive bento grid. The grid adapts across three breakpoints.

---

## User flows

### Registration

1. User picks a username (latin, digits, underscore, min 3 chars) and provides email + password (min 4 chars).
2. On success: `User` + `Profile` records created in a transaction; JWT returned.
3. If username is taken or reserved: backend returns `{ error: "username_taken", suggestions: [...] }` with up to 42 generated alternatives.
4. After registration, an onboarding wizard runs inside the editor (`OnboardingWizard` → `OnboardingInEditor`).

### Editor

Authenticated page at `/editor`. Contains:
- Profile card: avatar, background image, name, bio, contacts (phone, email, telegram).
- Block grid: add, edit, delete, drag-to-reorder, resize blocks.
- Public URL display + QR code.
- Today's page view counter.

### Public page

`/:username` (also `/u/:username`, `/public/:username`). Unauthenticated. Renders profile + blocks in read-only bento grid. Each visit increments the daily view counter for that profile's user.

---

## Data models

### User
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| email | TEXT UNIQUE | case-insensitive |
| passwordHash | TEXT | bcryptjs |
| createdAt | DATETIME | |

### Profile
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| userId | INTEGER FK → User | UNIQUE |
| username | TEXT UNIQUE | lowercase, latin/digit/underscore |
| name | TEXT | display name |
| bio | TEXT | |
| avatarUrl | TEXT | |
| backgroundUrl | TEXT | |
| phone | TEXT | |
| email | TEXT | public contact email (separate from auth email) |
| telegram | TEXT | |
| layout | TEXT | JSON `{ mobile, tablet, desktop: number[][] }` |
| blockSizes | TEXT | JSON `Record<blockId, { colSpan, rowSpan, anchorsByBreakpoint? }>` |

### Block
| Field | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| userId | INTEGER FK → User | |
| type | TEXT | see Block types |
| sort | INTEGER | ordering index |
| note | TEXT | text content (note, section) |
| noteStyle | TEXT | JSON — text styling for `note` type |
| linkUrl | TEXT | |
| photoUrl | TEXT | |
| videoUrl | TEXT | |
| musicEmbed | TEXT | URL or raw iframe embed |
| mapLat / mapLng | REAL | |
| socialType | TEXT | platform identifier |
| socialUrl | TEXT | normalized full URL |
| createdAt / updatedAt | DATETIME | updatedAt via trigger |

### daily_views
| Field | Type |
|---|---|
| user_id | INTEGER |
| view_date | TEXT `YYYY-MM-DD` |
| count | INTEGER |

View date uses Ekaterinburg timezone (UTC+5).

---

## Block types

| Type | Required fields | Validation |
|---|---|---|
| `section` | `note` (heading text) | — |
| `note` | `note` (text), optional `noteStyle` | — |
| `link` | `linkUrl` | http/https only, valid public host |
| `photo` | `photoUrl` | `/uploads/...` path or http/https URL |
| `video` | `videoUrl` | YouTube (incl. Shorts) or VK Video only |
| `music` | `musicEmbed` | Yandex Music URL or raw iframe embed |
| `map` | `mapLat`, `mapLng` | lat ∈ [-90, 90], lng ∈ [-180, 180] |
| `social` | `socialType`, `socialUrl` | URL must match platform; handle extracted and re-normalized |

### noteStyle fields (note block only)
```ts
{
  align?: "left" | "center" | "right"
  backgroundColor?: string   // hex #RGB / #RRGGBB / #RRGGBBAA
  textColor?: string
  fontFamily?: "default" | "serif" | "mono" | "system"
  bold?: boolean
  italic?: boolean
}
```

### Supported social platforms
`telegram`, `vk`, `instagram`, `twitter`, `linkedin`, `github`, `youtube`, `dribbble`, `behance`, `max`, `dprofile`, `figma`, `pinterest`, `tiktok`, `spotify`

---

## Bento grid system

Grid columns by breakpoint:

| Breakpoint | Columns |
|---|---|
| mobile | 2 |
| tablet | 2 |
| desktop | 4 |

Each block has a `BlockGridSize`:
```ts
{
  colSpan: number          // 1..GRID_COLUMNS
  rowSpan: number          // 1..6
  anchorsByBreakpoint?: {
    mobile?:  { gridColumnStart, gridRowStart }
    tablet?:  { gridColumnStart, gridRowStart }
    desktop?: { gridColumnStart, gridRowStart }
  }
}
```

Row height unit: `BENTO_ROW_UNIT = 8px`. `section` blocks are fixed at 56px regardless of rowSpan. Default sizes per type:

| Type | colSpan | rowSpan |
|---|---|---|
| section | 4 (full width) | 1 |
| note | 1 | 1 |
| link | 2 | 1 |
| photo | 2 | 2 |
| video | 2 | 2 |
| music | 2 | 1 |
| map | 2 | 2 |
| social | 1 | 1 |

Layout state is persisted as `Profile.layout` (column order) + `Profile.blockSizes` (dimensions + anchors). Both are saved on every resize or reorder.

---

## API reference

All private endpoints require `Authorization: Bearer <token>` header.  
Base path: `/api`

### Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{ username, email, password }` | `{ token, user }` |
| POST | `/auth/login` | — | `{ email, password }` | `{ token, user }` |
| POST | `/auth/check-username` | — | `{ username }` | `{ available, suggestions }` |
| POST | `/auth/check-email` | — | `{ email }` | `{ available }` |
| POST | `/auth/change-password` | ✓ | `{ currentPassword, newPassword }` | `{ ok, token }` |

### Profile

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/profile` | ✓ | Returns own profile; auto-creates if missing |
| PATCH | `/profile` | ✓ | Partial update: any profile field |

### Blocks

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/blocks` | ✓ | Own blocks, sorted by `sort ASC` |
| POST | `/blocks` | ✓ | `{ type, ...fields }` |
| PATCH | `/blocks/:id` | ✓ | Partial update |
| DELETE | `/blocks/:id` | ✓ | |
| POST | `/blocks/reorder` | ✓ | `{ items: [{ id, sort }] }` |

### Public

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/public/:username` | — | Returns `{ name, bio, avatarUrl, backgroundUrl, phone, email, telegram, blocks, layout, blockSizes }`. Increments daily view counter. |

### File upload

All endpoints: `POST`, auth required, multipart form-data, any field name.

| Path | Notes |
|---|---|
| `/storage/upload` | General |
| `/storage/image` | Same handler |
| `/storage/video` | Same handler |
| `/storage/audio` | Same handler |

Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, `video/ogg`, `audio/mpeg`, `audio/ogg`, `audio/wav`, `audio/mp4`.  
Max size: **50 MB**. File type verified from buffer (not from Content-Type header).  
Response: `{ url: "/uploads/<filename>" }`.

### Misc

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/qr?url=<url>` | — | Returns PNG QR code (256×256) |
| GET | `/stats/today` | ✓ | `{ today: <view_count> }` |
| GET | `/health` | — | `{ ok: true }` |

---

## Authentication

JWT stored in `localStorage`. Payload: `{ id, username, userCreatedAt, passwordHash }`.  
Token is invalidated if the user changes their password (hash mismatch on verify).  
Private API responses include `Cache-Control: private, no-store` when `Authorization` header is present.

---

## Reserved usernames

`login`, `register`, `editor`, `u`, `api`, `index.html`, `404.html`, `index`, `public`, `favicon.ico`, `robots.txt`

---

## File serving

Uploaded files served as static at `/uploads/<filename>`. Directory depends on environment:

| Environment | Path |
|---|---|
| Docker | `/app/uploads` (volume) |
| Render (no Docker) | `/tmp/uploads` |
| Local | `./uploads` |

Override with `UPLOAD_DIR` env var.
