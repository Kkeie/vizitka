# Testing

## Backend — интеграционные тесты

**Runner:** vitest  
**Расположение:** `backend/test/`  
**БД:** реальная SQLite в `/tmp`, создаётся на процесс в `test/setup.ts`

Тесты **не параллельны**: `fileParallelism: false`, `pool: forks`.

### Запуск

```bash
cd backend
npm test                                               # все тесты
npx vitest run test/auth.integration.test.ts           # один файл
```

### Тестовые файлы

| Файл | Модуль |
|---|---|
| `auth.integration.test.ts` | Регистрация, логин, смена пароля |
| `blocks.integration.test.ts` | CRUD блоков, переупорядочивание |
| `profile.integration.test.ts` | Чтение и обновление профиля |
| `uploads.integration.test.ts` | Валидация загрузки файлов |
| `public.integration.test.ts` | Публичная страница, счётчик просмотров |

---

## Frontend — E2E тесты

**Runner:** Playwright  
**Расположение:** `frontend/e2e/`

`playwright.config.ts` автоматически:
1. Собирает backend (`npm run build`)
2. Запускает backend (`npm start`)
3. Запускает Vite dev server

### Запуск

```bash
cd frontend
npm run test:e2e        # headless
npm run test:e2e:ui     # Playwright UI (интерактивный)
```

### Тестовые файлы

| Файл | Покрытие |
|---|---|
| `ui-test-cases.spec.ts` | Авторизация, редактор, публичная страница |
| `visual-capture.spec.ts` | Визуальные скриншоты ключевых страниц |

---

## Документация тест-кейсов

- **Каталог тест-кейсов** (ручные + автоматизированные): [`docs/TEST-CASES.md`](TEST-CASES.md)
- **Описание подхода к тестированию**: [`docs/TESTS-EXPLAINED.md`](TESTS-EXPLAINED.md)

---

## Правила для агентов

- Добавлять или обновлять тесты для всей новой логики.
- Запускать `npm test` (backend) или `npm run test:e2e` (frontend) после изменений.
- Сообщать точный результат: pass/fail, не «должно работать».
- Максимум 3 цикла исправлений на один блокер, затем эскалировать.
