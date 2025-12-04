# Исправление проблемы: запросы не идут на бэкенд

## Проблема
Ошибка 405 от nginx на фронтенде означает, что запросы не уходят на бэкенд, а обрабатываются nginx на фронтенде.

## Причина
Переменная `VITE_BACKEND_API_URL` не установлена в Railway для фронтенда, поэтому используется относительный путь `/api`, который обрабатывается nginx на фронтенде.

## Решение

### Шаг 1: Установите переменную окружения в Railway

1. Откройте **Frontend сервис** в Railway
2. Перейдите в **Settings** → **Variables**
3. Нажмите **+ New Variable**
4. **Name**: `VITE_BACKEND_API_URL`
5. **Value**: `https://your-backend.railway.app/api`
   - Замените `your-backend.railway.app` на реальный URL вашего бэкенда
   - **ВАЖНО**: URL должен заканчиваться на `/api`

### Шаг 2: Как узнать URL бэкенда

1. Откройте **Backend сервис** в Railway
2. Перейдите в **Settings** → **Networking**
3. Найдите **Public Domain** (например: `https://backend-production.up.railway.app`)
4. Скопируйте этот URL
5. Добавьте `/api` в конец: `https://backend-production.up.railway.app/api`

### Шаг 3: Передеплойте фронтенд

После установки переменной окружения:

1. Railway автоматически пересоберет фронтенд
2. Или вручную: **Deployments** → **Redeploy**

### Шаг 4: Проверьте в браузере

1. Откройте фронтенд в браузере
2. Откройте **Console** (F12 → Console)
3. Должны появиться логи:
   ```
   [API] Backend URL: https://your-backend.railway.app/api
   [API] VITE_BACKEND_API_URL: https://your-backend.railway.app/api
   ```
4. При попытке регистрации должен появиться лог:
   ```
   [API] Register request to: https://your-backend.railway.app/api/auth/register
   ```

### Шаг 5: Проверьте Network tab

1. F12 → **Network**
2. Попробуйте зарегистрироваться
3. Найдите запрос к `/auth/register`
4. **Request URL** должен быть: `https://your-backend.railway.app/api/auth/register`
   - НЕ `https://your-frontend.railway.app/api/auth/register`!

## Важно

- ✅ Переменная `VITE_BACKEND_API_URL` должна быть установлена **ДО** сборки фронтенда
- ✅ Если переменная установлена после сборки - нужно пересобрать фронтенд
- ✅ URL должен быть полным (с `https://`) и заканчиваться на `/api`

## Проверка

После установки переменной:

1. В Console браузера проверьте логи `[API]`
2. В Network tab проверьте, что запросы идут на домен бэкенда
3. Попробуйте зарегистрироваться - должно работать!

## Если не работает

1. Убедитесь, что переменная установлена правильно (с `/api` в конце)
2. Передеплойте фронтенд после установки переменной
3. Проверьте Console браузера - там должны быть логи с правильным URL
4. Проверьте Network tab - запрос должен идти на бэкенд, а не на фронтенд
