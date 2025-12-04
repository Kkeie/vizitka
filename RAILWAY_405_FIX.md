# Исправление ошибки 405 при регистрации

## Проблема
- Ошибка 405 (Method Not Allowed) при регистрации
- Volume не создан в Railway
- В логах бэкенда ничего нет

## Решение

### Шаг 1: Создайте Volume для базы данных

1. В Railway: Backend сервис → **Settings** → **Volumes**
2. Нажмите **+ New Volume**
3. **Mount Path**: `/app/data`
4. **Size**: 1 GB
5. Сохраните и передеплойте бэкенд

### Шаг 2: Проверьте переменные окружения

#### Backend (Railway → Settings → Variables):

```
DATABASE_PATH=/app/data/db.sqlite
NODE_ENV=production
PORT=3000
JWT_SECRET=ваш-секретный-ключ-минимум-32-символа
FRONTEND_URL=https://your-frontend.railway.app,http://localhost:5173
```

#### Frontend (Railway → Settings → Variables):

```
VITE_BACKEND_API_URL=https://your-backend.railway.app/api
VITE_BASE_PATH=/
```

**ВАЖНО**: Замените `your-backend.railway.app` и `your-frontend.railway.app` на реальные URL из Railway!

### Шаг 3: Проверьте URL бэкенда

1. В Railway откройте Backend сервис
2. Settings → **Networking** → скопируйте **Public Domain**
3. Убедитесь, что в Frontend переменной `VITE_BACKEND_API_URL` указан правильный URL с `/api` в конце

Например:
- Backend URL: `https://backend-production.up.railway.app`
- VITE_BACKEND_API_URL: `https://backend-production.up.railway.app/api`

### Шаг 4: Проверьте запросы в браузере

1. Откройте фронтенд в браузере
2. F12 → **Network**
3. Попробуйте зарегистрироваться
4. Найдите запрос к `/api/auth/register`
5. Проверьте:
   - **Request URL** - должен быть `https://your-backend.railway.app/api/auth/register`
   - **Request Method** - должен быть `POST`
   - **Status Code** - если 405, значит запрос не доходит до бэкенда

### Шаг 5: Проверьте логи бэкенда

После попытки регистрации:

1. Railway → Backend → **Deployments** → последний деплой → **Logs**
2. Должны появиться строки:
   ```
   [POST] /api/auth/register
   [REGISTER] Attempt: ...
   ```

Если логов нет - запрос не доходит до бэкенда.

## Возможные причины ошибки 405

### 1. Неправильный URL бэкенда

**Проверка**: В Network tab проверьте Request URL

**Решение**: Убедитесь, что `VITE_BACKEND_API_URL` установлен правильно

### 2. CORS блокирует запрос

**Проверка**: В Network tab проверьте, есть ли ошибка CORS

**Решение**: Я временно разрешил все origins в CORS. После исправления можно ограничить.

### 3. Запрос идет на фронтенд вместо бэкенда

**Проверка**: Request URL должен быть на домене бэкенда, а не фронтенда

**Решение**: Проверьте переменную `VITE_BACKEND_API_URL`

### 4. Railway проксирует запросы неправильно

**Решение**: Убедитесь, что фронтенд и бэкенд - это отдельные сервисы в Railway

## Тестирование

1. Создайте Volume для базы данных
2. Установите правильные переменные окружения
3. Передеплойте оба сервиса
4. Попробуйте зарегистрироваться
5. Проверьте логи бэкенда - должны появиться записи о запросе

## Если ошибка продолжается

1. Проверьте, что запрос в Network tab идет на правильный URL бэкенда
2. Проверьте логи бэкенда - должны быть записи о запросе
3. Если логов нет - проблема в маршрутизации или CORS
4. Попробуйте открыть `https://your-backend.railway.app/api/health` в браузере - должен вернуться `{"ok":true}`
