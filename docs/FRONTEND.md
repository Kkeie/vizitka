# Frontend

## Стек

- React 18 + TypeScript
- Vite (бандлер, dev-сервер, прокси)
- dnd-kit (drag-and-drop)
- CSS custom properties (дизайн-токены через `var(--token)`)
- Без компонентных библиотек (MUI, Chakra и др.)

---

## Дерево компонентов (упрощённо)

```
Shell
├── SessionContext.Provider
├── Navbar
└── Router
    ├── /editor → Editor (pages/Editor.tsx)
    │   ├── ProfileCard
    │   ├── AddBlockGrid / AddBlockButtons
    │   ├── BlockMasonryGrid (или SortableBlockCard list)
    │   │   ├── DraggableBlockCard → BlockCard
    │   │   └── SizeMenu (resize)
    │   └── BlockModal
    │       └── ImageUploader
    ├── /:username → Public (pages/Public.tsx)
    │   ├── ProfileCard (read-only)
    │   └── BlockMasonryGrid (read-only)
    └── /login, /register → Auth pages
```

---

## Auth state

JWT хранится в `localStorage`. `Shell` читает его при монтировании, проверяет истечение на клиенте и заполняет `SessionContext`. `subscribeAuthToken` срабатывает при логине/логауте в другой вкладке.

```ts
// SessionContext shape
{ user: User | null, authReady: boolean, setUser: (u: User | null) => void }
```

---

## Дизайн-токены

Все визуальные значения — CSS custom properties. Не менять через inline-стили напрямую.

| Токен | Назначение |
|---|---|
| `--text` | Основной цвет текста |
| `--muted` | Приглушённый текст, плейсхолдеры |
| `--border` | Цвет рамок |
| `--accent` | Фон акцентных элементов, hover-состояния |
| `--primary` | Акцентный цвет (кнопки, ссылки) |
| `--surface` | Фон карточек |
| `--radius-sm` | Радиус скругления (малый) |

---

## Ключевые паттерны

### Рендер блока

`BlockCard` переключается по `block.type`. Новый тип требует изменений в `BlockCard` и `BlockModal`.

### Inline-редактирование

`InlineEditCard` — двойной клик для редактирования note/section на месте без открытия модалки.

### Загрузка изображений

`ImageUploader`:
- Принимает файл через input или drag-and-drop
- Показывает превью до загрузки (FileReader → base64)
- Загружает на `/api/storage/upload`
- Превью ограничено `maxHeight: 40vh` с letterbox для портретных фото
- После появления превью зона замены файла схлопывается до одной строки

### Grid engine

`lib/block-grid.ts` — движок бенто-сетки. Подробнее: [`docs/design-docs/bento-grid.md`](design-docs/bento-grid.md)

---

## API-слой

Все запросы через `api.ts`. Никогда не вызывать `fetch` напрямую из компонентов.

Важные функции:
- `uploadImage(file)` → `{ url: string }`
- `getImageUrl(path)` → абсолютный URL для отображения
- `getProfile()`, `updateProfile(data)`
- `getBlocks()`, `createBlock(data)`, `updateBlock(id, data)`, `deleteBlock(id)`
- `reorderBlocks(items)`

---

## Тестирование UI

E2E тесты: `frontend/e2e/` (Playwright). Запуск: `npm run test:e2e`.

Детали: [`docs/TESTING.md`](TESTING.md)
