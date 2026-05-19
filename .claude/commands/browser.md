# Browser

Открывает браузер через MCP Playwright и позволяет взаимодействовать с веб-страницами: навигация, скриншоты, снимки DOM.

## MCP-сервер

`@playwright/mcp` (headless Chromium). Подключается автоматически из `.mcp.json`.

## Основные инструменты

| Инструмент | Назначение |
|---|---|
| `browser_navigate` | Перейти по URL |
| `browser_screenshot` | Снимок экрана (возвращает изображение) |
| `browser_snapshot` | Снимок accessibility-дерева DOM (текстовый, без скриншота) |
| `browser_click` | Клик по элементу (через ref из snapshot) |
| `browser_type` | Ввод текста в поле |
| `browser_wait_for` | Ожидание появления элемента или текста |
| `browser_resize` | Изменить размер окна |

## Сценарии использования

### Визуальная проверка UI-изменения

```
1. browser_navigate → http://localhost:5173
2. browser_screenshot → убедиться, что страница загрузилась
3. Выполнить нужное действие (клик, ввод текста)
4. browser_screenshot → проверить результат
```

### Инспекция конкретного элемента

```
1. browser_navigate → нужная страница
2. browser_snapshot → получить accessibility-дерево
3. Найти нужный элемент по роли, label или тексту
4. browser_click / browser_type → взаимодействовать
```

### Проверка адаптивности

```
1. browser_resize → { width: 375, height: 812 }  (мобильный)
2. browser_screenshot
3. browser_resize → { width: 1440, height: 900 } (десктоп)
4. browser_screenshot
```

## Локальные адреса

| Сервис | URL |
|---|---|
| Frontend (dev) | http://localhost:5173 |
| Backend API | http://localhost:3000/api/health |
| Публичная страница | http://localhost:5173/:username |
| Редактор | http://localhost:5173/editor |

## Правила

- Перед скриншотом всегда делать `browser_navigate` — браузер мог остаться на другой странице.
- Для UI-задач делать скриншот **до** изменений и **после** — наглядное сравнение.
- `browser_snapshot` не делает скриншот, зато работает быстрее и возвращает структуру DOM для поиска элементов.
- Если страница не загрузилась — проверить, запущен ли dev-сервер (`npm run dev` в `frontend/`).
- После завершения работы браузер закрывается автоматически.
