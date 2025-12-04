# КРИТИЧНО: Установка VITE_BACKEND_API_URL

## Проблема
В консоли браузера видно:
```
WARNING: VITE_BACKEND_API_URL not set! Using relative path: /api
```

Это означает, что запросы идут на фронтенд вместо бэкенда.

## РЕШЕНИЕ (обязательно выполнить!)

### Шаг 1: Узнайте URL бэкенда

1. Railway → **Backend сервис** → Settings → **Networking**
2. Найдите **Public Domain** (например: `https://vizitka-production.up.railway.app`)
3. Скопируйте этот URL

### Шаг 2: Установите переменную для фронтенда

1. Railway → **Frontend сервис** → Settings → **Variables**
2. Нажмите **+ New Variable**
3. **Name**: `VITE_BACKEND_API_URL`
   - ⚠️ **ВАЖНО**: Название должно быть ТОЧНО таким (с префиксом `VITE_`)
4. **Value**: `https://vizitka-production.up.railway.app/api`
   - ⚠️ **ВАЖНО**: Замените на реальный URL вашего бэкенда!
   - ⚠️ **ВАЖНО**: URL должен заканчиваться на `/api`
   - ⚠️ **ВАЖНО**: URL должен начинаться с `https://`

5. Сохраните

### Шаг 3: ПЕРЕДЕПЛОЙТЕ фронтенд

⚠️ **КРИТИЧНО**: После установки переменной нужно пересобрать фронтенд!

1. Railway → Frontend сервис → **Deployments**
2. Нажмите **Redeploy** (или дождитесь автоматического редеплоя)
3. Дождитесь завершения сборки (может занять 1-2 минуты)

### Шаг 4: Проверьте в браузере

1. **Очистите кэш браузера** (Ctrl+Shift+Delete) или откройте в режиме инкогнито
2. Откройте фронтенд в браузере
3. F12 → **Console**
4. Должны быть логи:
   ```
   [API] Backend URL: https://vizitka-production.up.railway.app/api
   [API] VITE_BACKEND_API_URL env: https://vizitka-production.up.railway.app/api
   ```
5. **НЕ должно быть**:
   ```
   [API] WARNING: VITE_BACKEND_API_URL not set!
   ```

### Шаг 5: Проверьте Network tab

1. F12 → **Network**
2. Попробуйте зарегистрироваться
3. Найдите запрос к `register` или `auth/register`
4. **Request URL** должен быть: `https://vizitka-production.up.railway.app/api/auth/register`
   - ✅ Правильно: URL бэкенда
   - ❌ Неправильно: `https://fortunate-rejoicing-production.up.railway.app/api/auth/register` (URL фронтенда)

## Частые ошибки

### Ошибка 1: Переменная установлена, но предупреждение все равно есть

**Причина**: Фронтенд не был пересобран после установки переменной

**Решение**: Передеплойте фронтенд (Deployments → Redeploy)

### Ошибка 2: Переменная называется неправильно

**Неправильно**: `BACKEND_API_URL` (без префикса `VITE_`)
**Правильно**: `VITE_BACKEND_API_URL` (с префиксом `VITE_`)

Vite использует только переменные с префиксом `VITE_`!

### Ошибка 3: URL неправильный

**Неправильно**: 
- `https://vizitka-production.up.railway.app` (без `/api`)
- `vizitka-production.up.railway.app/api` (без `https://`)

**Правильно**: `https://vizitka-production.up.railway.app/api`

## Проверка правильности

После установки переменной и передеплоя:

1. ✅ Console: `[API] Backend URL: https://vizitka-production.up.railway.app/api`
2. ✅ Console: НЕТ предупреждения `WARNING: VITE_BACKEND_API_URL not set!`
3. ✅ Network: Запросы идут на домен бэкенда, а не фронтенда
4. ✅ Регистрация работает без ошибки 405

## Если не работает

1. Убедитесь, что переменная называется именно `VITE_BACKEND_API_URL`
2. Убедитесь, что значение правильное (с `https://` и `/api` в конце)
3. Убедитесь, что фронтенд был пересобран ПОСЛЕ установки переменной
4. Очистите кэш браузера или откройте в режиме инкогнито
5. Проверьте Console - там должны быть логи с правильным URL
