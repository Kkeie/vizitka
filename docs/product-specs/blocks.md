# Типы блоков и сетка

## Типы блоков

| Тип | Обязательные поля | Валидация |
|---|---|---|
| `section` | `note` (текст заголовка) | — |
| `note` | `note` (текст), опц. `noteStyle` | — |
| `link` | `linkUrl` | только http/https, публичный хост |
| `photo` | `photoUrl` | путь `/uploads/...` или http/https URL |
| `video` | `videoUrl` | только YouTube (incl. Shorts) или VK Video |
| `music` | `musicEmbed` | URL Yandex Music или raw iframe |
| `map` | `mapLat`, `mapLng` | lat ∈ [-90, 90], lng ∈ [-180, 180] |
| `social` | `socialType`, `socialUrl` | URL должен соответствовать платформе; handle нормализуется |

### noteStyle (только для `note`)

```ts
{
  align?: "left" | "center" | "right"
  backgroundColor?: string   // hex: #RGB / #RRGGBB / #RRGGBBAA
  textColor?: string
  fontFamily?: "default" | "serif" | "mono" | "system"
  bold?: boolean
  italic?: boolean
}
```

### Поддерживаемые соцсети

`telegram`, `vk`, `instagram`, `twitter`, `linkedin`, `github`, `youtube`,
`dribbble`, `behance`, `max`, `dprofile`, `figma`, `pinterest`, `tiktok`, `spotify`

---

## Размеры по умолчанию

| Тип | colSpan | rowSpan |
|---|---|---|
| `section` | 4 (полная ширина) | 1 |
| `note` | 1 | 1 |
| `link` | 2 | 1 |
| `photo` | 2 | 2 |
| `video` | 2 | 2 |
| `music` | 2 | 1 |
| `map` | 2 | 2 |
| `social` | 1 | 1 |

---

## Бенто-сетка

### Брейкпоинты

| Брейкпоинт | Колонок |
|---|---|
| `mobile` | 2 |
| `tablet` | 2 |
| `desktop` | 4 |

Единица высоты ряда: `BENTO_ROW_UNIT = 8px`. Блоки `section` фиксированы на 56px вне зависимости от `rowSpan`.

### Структура `BlockGridSize`

```ts
{
  colSpan: number          // 1..GRID_COLUMNS
  rowSpan: number          // 1..6
  anchorsByBreakpoint?: {
    mobile?:  { gridColumnStart: number, gridRowStart: number }
    tablet?:  { gridColumnStart: number, gridRowStart: number }
    desktop?: { gridColumnStart: number, gridRowStart: number }
  }
}
```

### Хранение layout

На `Profile`:
- `blockSizes` — `Record<blockId, BlockGridSize>` — размеры и якоря
- `layout` — `{ mobile, tablet, desktop: number[][] }` — порядок колонок по брейкпоинтам

Оба поля сохраняются при каждом resize или reorder через `PATCH /api/profile`.

### Движок (`lib/block-grid.ts`)

- **Sparse-anchor assignment** — блок без явного якоря размещается в первый свободный слот
- **Разрешение перекрытий** — при конфликте побеждает блок с меньшим индексом в `layout`
- **Clamping** — `colSpan` не может выходить за границу сетки

Подробнее о дизайне: [`docs/design-docs/bento-grid.md`](../design-docs/bento-grid.md)
