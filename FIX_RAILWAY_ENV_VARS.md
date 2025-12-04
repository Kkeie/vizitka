# КРИТИЧНО: Переменные окружения не попадают в сборку

## Проблема
Переменная `VITE_BACKEND_API_URL` установлена в Railway, но запросы все равно идут на фронтенд.

## Причина
Railway может не передавать переменные окружения как build arguments при использовании Dockerfile.

## РЕШЕНИЕ: Использовать Railway Static Files вместо Dockerfile

### Шаг 1: Удалите railway.json (чтобы Railway не использовал Dockerfile)

1. Удалите или переименуйте `frontend/railway.json`
2. Или измените builder на NIXPACKS

### Шаг 2: Настройте Railway Static Files

1. Railway → Frontend сервис → Settings
2. Найдите **Service Type** или **Builder**
3. Выберите **Static Files** (или **Nixpacks**)
4. **Root Directory**: `frontend`
5. **Output Directory**: `dist`
6. **Build Command**: `npm install && npm run build`

### Шаг 3: Убедитесь, что переменная установлена

Railway → Frontend → Settings → Variables:
- Name: `VITE_BACKEND_API_URL`
- Value: `https://vizitka-production.up.railway.app/api`

### Шаг 4: Передеплойте фронтенд

Railway → Frontend → Deployments → **Redeploy**

### Шаг 5: Проверьте в браузере

1. F12 → Console
2. Должны быть логи: `[API] Backend URL: https://vizitka-production.up.railway.app/api`
3. НЕ должно быть: `WARNING: VITE_BACKEND_API_URL not set!`

## Альтернатива: Исправить Dockerfile

Если хотите использовать Dockerfile, Railway должен передавать переменные автоматически. Но лучше использовать Static Files - это проще и надежнее для статических сайтов.

## Почему Static Files лучше:

- ✅ Railway автоматически передает переменные окружения в процесс сборки
- ✅ Не нужно настраивать ARG/ENV в Dockerfile
- ✅ Проще и быстрее для статических сайтов
- ✅ Меньше вероятность ошибок
