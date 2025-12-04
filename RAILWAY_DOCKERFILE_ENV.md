# Исправление: Переменные окружения не попадают в сборку Dockerfile

## Проблема
Переменная `VITE_BACKEND_API_URL` установлена в Railway, но запросы все равно идут на фронтенд.

## Причина
При использовании Dockerfile переменные окружения должны быть переданы как **build arguments** (ARG) во время сборки, а не только как runtime переменные.

## Решение

Я обновил `frontend/Dockerfile` чтобы принимать переменные окружения как build arguments.

### Что нужно сделать:

1. **Убедитесь, что переменная установлена в Railway**:
   - Railway → Frontend сервис → Settings → Variables
   - Name: `VITE_BACKEND_API_URL`
   - Value: `https://vizitka-production.up.railway.app/api`

2. **Railway автоматически передаст переменные как build args**:
   - Railway автоматически передает все переменные окружения с префиксом `VITE_` как build arguments
   - Но нужно убедиться, что Dockerfile правильно их принимает

3. **Передеплойте фронтенд**:
   - Railway → Frontend → Deployments → **Redeploy**
   - Или дождитесь автоматического редеплоя после изменения Dockerfile

4. **Проверьте логи сборки**:
   - Railway → Frontend → Deployments → последний деплой → Logs
   - Ищите строку `RUN npm run build`
   - Должна быть видна переменная окружения

5. **Проверьте в браузере**:
   - F12 → Console
   - Должны быть логи: `[API] Backend URL: https://vizitka-production.up.railway.app/api`
   - НЕ должно быть: `WARNING: VITE_BACKEND_API_URL not set!`

## Альтернатива: Использовать Railway Static Files

Если Dockerfile продолжает вызывать проблемы:

1. **Удалите или переименуйте** `frontend/railway.json`
2. В Railway Settings:
   - **Service Type**: Static Files
   - **Root Directory**: `frontend`
   - **Output Directory**: `dist`
   - **Build Command**: `npm install && npm run build`
3. Railway автоматически передаст переменные окружения в процесс сборки

## Проверка

После передеплоя:

1. ✅ Console браузера: Правильный URL бэкенда
2. ✅ Network tab: Запросы идут на бэкенд
3. ✅ Регистрация работает
