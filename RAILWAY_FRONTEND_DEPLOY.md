# Деплой Frontend на Railway

## Проблема
```
The executable `npx` could not be found
```

Railway не может найти `npx` в runtime образе.

## Решение: Использовать Static Files (РЕКОМЕНДУЕТСЯ)

Railway автоматически определяет статические сайты и использует встроенный веб-сервер.

### Шаг 1: Создайте новый сервис

1. В Railway: **+ New Service** → **Deploy from GitHub repo**
2. Выберите ваш репозиторий
3. **Root Directory**: `frontend`

### Шаг 2: Настройте как Static Files

1. Railway автоматически определит, что это статический сайт
2. Если не определил автоматически:
   - Settings → **Service Type** → выберите **Static Files**
   - **Output Directory**: `dist`
   - **Build Command**: `npm install && npm run build`

### Шаг 3: Переменные окружения

Settings → Variables → добавьте:
```
VITE_BACKEND_API_URL=https://your-backend.railway.app/api
VITE_BASE_PATH=/
```

Где `your-backend.railway.app` - это URL вашего бэкенда (см. `RAILWAY_BACKEND_URL.md`)

### Шаг 4: Деплой

Railway автоматически задеплоит статический сайт без необходимости в runtime сервере.

---

## Альтернатива: Использовать Dockerfile с Nginx

Если Railway не определяет статический сайт автоматически:

1. Убедитесь, что `frontend/Dockerfile` существует (он уже есть)
2. В Railway Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: оставьте пустым (используется Dockerfile)
   - **Start Command**: оставьте пустым (используется CMD из Dockerfile)

Dockerfile уже настроен для использования nginx, который отлично работает для статики.

---

## Альтернатива 2: Установить serve в package.json

Если нужно использовать `serve`:

1. Добавьте в `frontend/package.json`:
```json
{
  "scripts": {
    "start": "serve -s dist -l $PORT"
  },
  "dependencies": {
    "serve": "^14.2.1"
  }
}
```

2. В Railway:
   - **Start Command**: `npm start`

Но лучше использовать Static Files или Dockerfile с nginx - они надежнее.
