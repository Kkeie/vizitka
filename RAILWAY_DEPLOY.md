# Пошаговая инструкция по деплою на Railway

## Важно: Railway требует деплоить backend и frontend как ОТДЕЛЬНЫЕ сервисы!

## Шаг 1: Деплой Backend

1. **Войдите в Railway**: [railway.app](https://railway.app)
2. **Создайте новый проект**: **New Project**
3. **Выберите**: **Deploy from GitHub repo**
4. **Выберите ваш репозиторий**
5. **ВАЖНО**: После добавления репозитория:
   - Railway покажет список файлов
   - **НЕ** нажимайте "Deploy" сразу!
   - Вместо этого нажмите на **Settings** (шестеренка) сервиса
   - В разделе **Root Directory** укажите: `backend`
   - **ВАЖНО**: В разделе **Build Command** оставьте пустым или удалите (Railway использует `nixpacks.toml`)
   - **ВАЖНО**: В разделе **Start Command** оставьте пустым или удалите (Railway использует `nixpacks.toml`)
   - Убедитесь, что **Builder** установлен на **Nixpacks** (не Docker!)

6. **Настройте переменные окружения** (Settings → Variables):
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=ваш-секретный-ключ-здесь-минимум-32-символа
   DATABASE_URL=file:/app/data/dev.db
   ```

7. **Создайте Volume для базы данных**:
   - Settings → **New Volume**
   - Mount Path: `/app/data`
   - Это нужно для сохранения SQLite базы данных

8. **Деплой**: Railway автоматически начнет деплой

9. **Получите URL бэкенда**:
   - После успешного деплоя Railway покажет URL (например: `https://your-backend.railway.app`)
   - Скопируйте этот URL - он понадобится для фронтенда

---

## Шаг 2: Деплой Frontend

1. **В том же проекте Railway**:
   - Нажмите **+ New Service**
   - Выберите **Deploy from GitHub repo**
   - Выберите **тот же репозиторий**

2. **Настройте Frontend сервис**:
   - Settings → **Root Directory**: `frontend`
   - Settings → **Build Command**: `npm install && npm run build`
   - Settings → **Start Command**: `npx serve -s dist -l $PORT`
   - Или используйте Railway Static Files (см. ниже)

3. **Настройте переменные окружения**:
   ```
   VITE_BACKEND_API_URL=https://your-backend.railway.app/api
   VITE_BASE_PATH=/
   PORT=3000
   ```

4. **Альтернатива: Static Files**:
   - Railway может автоматически определить статический сайт
   - Если Railway предлагает "Static Files" - используйте это
   - Root Directory: `frontend`
   - Output Directory: `dist`

---

## Шаг 3: Настройка CORS на Backend

Убедитесь, что бэкенд разрешает запросы с домена фронтенда:

1. Откройте `backend/src/app.ts`
2. Найдите строку `app.use(cors());`
3. Замените на:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend.railway.app',
    'http://localhost:5173' // для локальной разработки
  ],
  credentials: true
}));
```

Где `your-frontend.railway.app` - это URL вашего фронтенда на Railway.

---

## Шаг 4: Проверка деплоя

1. **Backend**: Откройте `https://your-backend.railway.app/api/health`
   - Должен вернуться `{"ok":true}`

2. **Frontend**: Откройте URL фронтенда
   - Должен загрузиться сайт
   - Проверьте в DevTools → Network, что API запросы идут на правильный URL

---

## Troubleshooting

### Ошибка: "Railpack could not determine how to build"

**Решение**: Убедитесь, что вы указали **Root Directory** в настройках сервиса!

### Backend не запускается

**Проверьте**:
- Переменные окружения настроены правильно
- Volume создан и смонтирован в `/app/data`
- Build Command выполнился успешно (проверьте логи)

### Frontend не может подключиться к Backend

**Проверьте**:
- `VITE_BACKEND_API_URL` указан правильно (с `/api` в конце)
- CORS настроен на бэкенде
- Backend действительно работает (проверьте `/api/health`)

### База данных не сохраняется

**Решение**: Убедитесь, что Volume создан и смонтирован в `/app/data`

---

## Альтернативный способ через Railway CLI

Если веб-интерфейс не работает, можно использовать CLI:

1. **Установите Railway CLI**:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Деплой Backend**:
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Деплой Frontend** (в новом терминале):
   ```bash
   cd frontend
   railway init
   railway up
   ```

---

## Важные замечания

1. **SQLite на Railway**: Работает только с Volume. Без Volume данные будут теряться при каждом редеплое.

2. **Бесплатный tier**: Railway предоставляет ограниченные ресурсы. Для production рекомендуется платный план.

3. **Переменные окружения**: Никогда не коммитьте секреты в Git! Используйте Railway Variables.

4. **Домены**: Railway предоставляет бесплатные домены вида `*.railway.app`. Можно подключить свой домен в Settings.
