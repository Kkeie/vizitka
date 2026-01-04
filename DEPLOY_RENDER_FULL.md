# Деплой Frontend и Backend на Render

Render поддерживает как статические сайты (frontend), так и веб-сервисы (backend). Это удобно - все в одном месте!

## Шаг 1: Регистрация на Render

1. Перейдите на [render.com](https://render.com)
2. Зарегистрируйтесь через GitHub (рекомендуется)
3. Подключите ваш GitHub репозиторий

## Шаг 2: Деплой Backend

### 2.1 Создание Web Service

1. Нажмите **"New +"** → **"Web Service"**
2. Выберите ваш репозиторий `vizitka`
3. Заполните форму:

   - **Name**: `vizitka-backend` (или `bento-backend`)
   - **Language**: `Node`
   - **Branch**: `main`
   - **Region**: `Frankfurt (EU Central)` ✅
   - **Root Directory**: `backend` ⚠️ **ВАЖНО!**
   - **Build Command**: `NODE_ENV=development npm install && npm run build` ⚠️ **ВАЖНО!**
   - **Start Command**: `npm start`
   - **Plan**: `Free` ✅

### 2.2 Переменные окружения для Backend

В разделе **"Environment Variables"** добавьте:

```
DATABASE_PATH = /app/data/db.sqlite
JWT_SECRET = ваш_случайный_секретный_ключ_минимум_32_символа
FRONTEND_URL = https://vizitka.onrender.com
BACKEND_URL = https://vizitka-backend.onrender.com
NODE_ENV = production
PORT = 3000
```

⚠️ **Важно**: 
- Замените `vizitka.onrender.com` на реальный URL вашего frontend сервиса
- Замените `vizitka-backend.onrender.com` на реальный URL вашего backend сервиса (тот же, что будет использоваться в `VITE_BACKEND_API_URL`)

**Как сгенерировать JWT_SECRET:**
```bash
# В терминале
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Деплой Backend

1. Нажмите **"Create Web Service"**
2. Дождитесь завершения деплоя (5-10 минут)
3. После успешного деплоя скопируйте URL (например: `https://vizitka-backend.onrender.com`)

## Шаг 3: Деплой Frontend

### 3.1 Создание Static Site

1. Нажмите **"New +"** → **"Static Site"**
2. Выберите ваш репозиторий `vizitka`
3. Заполните форму:

   - **Name**: `vizitka` (или `vizitka-frontend`)
   - **Branch**: `main`
   - **Root Directory**: `frontend` ⚠️ **ВАЖНО!**
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist` ⚠️ **ВАЖНО!**
   - **Plan**: `Free` ✅

### 3.2 Переменные окружения для Frontend

В разделе **"Environment Variables"** добавьте:

```
VITE_BACKEND_API_URL = https://vizitka-backend.onrender.com/api
VITE_BASE_PATH = /
```

⚠️ **Важно**: 
- Замените `vizitka-backend.onrender.com` на реальный URL вашего backend сервиса!
- **Обязательно добавьте `/api` в конце URL** (например: `https://vizitka-backend.onrender.com/api`)

### 3.3 Деплой Frontend

1. Нажмите **"Create Static Site"**
2. Дождитесь завершения деплоя (3-5 минут)
3. После успешного деплоя ваш сайт будет доступен по адресу: `https://vizitka.onrender.com`

## Шаг 4: Настройка CORS на Backend

После деплоя frontend обновите переменную `FRONTEND_URL` в настройках backend:

1. Перейдите в настройки вашего backend сервиса
2. Environment Variables
3. Обновите `FRONTEND_URL` на URL вашего frontend: `https://vizitka.onrender.com`
4. Render автоматически перезапустит сервис

## Шаг 5: Проверка работы

1. Откройте ваш frontend: `https://vizitka.onrender.com`
2. Попробуйте зарегистрироваться
3. Проверьте консоль браузера (F12) на наличие ошибок
4. Проверьте логи в Render Dashboard если что-то не работает

## Важные замечания

### На бесплатном плане Render:

⚠️ **Backend (Web Service):**
- Приложение "засыпает" после 15 минут бездействия
- Первый запрос после пробуждения может занять 30-60 секунд
- Это нормально для бесплатного плана

✅ **Frontend (Static Site):**
- Работает всегда, без задержек
- Автоматический деплой при каждом push в main
- HTTPS из коробки

### Автоматический деплой:

Оба сервиса автоматически перезапускаются при каждом push в ветку `main`:
- Backend: пересобирается и перезапускается
- Frontend: пересобирается и обновляется

## Troubleshooting

### Проблема: Frontend не может подключиться к Backend

**Решение:**
1. Проверьте `VITE_BACKEND_API_URL` в переменных окружения frontend
2. Убедитесь, что URL начинается с `https://`
3. Проверьте CORS настройки в backend (должен быть указан правильный `FRONTEND_URL`)
4. Проверьте логи backend в Render Dashboard

### Проблема: Build failed на Frontend

**Решение:**
1. Проверьте логи build в Render Dashboard
2. Убедитесь, что Root Directory указан как `frontend`
3. Проверьте, что Publish Directory указан как `dist`
4. Убедитесь, что Build Command правильный: `npm install && npm run build`

### Проблема: Build failed на Backend

**Решение:**
1. Проверьте логи build в Render Dashboard
2. Убедитесь, что Root Directory указан как `backend`
3. Проверьте, что в `backend/package.json` есть скрипт `build`
4. Убедитесь, что все зависимости указаны в `package.json`

### Проблема: 404 при переходе на страницы

**Решение:**
Render Static Sites автоматически обрабатывают SPA роутинг, но если проблема есть:
1. Убедитесь, что используется React Router
2. Проверьте, что `404.html` существует в `frontend/public/`

### Проблема: Изображения не загружаются

**Решение:**
1. Убедитесь, что backend правильно отдает статические файлы из `/uploads`
2. Проверьте, что URL изображений начинаются с `/uploads/` или полного URL backend
3. Проверьте CORS настройки на backend

## Структура на Render

После деплоя у вас будет:

```
Render Dashboard
├── vizitka-backend (Web Service)
│   ├── URL: https://vizitka-backend.onrender.com
│   ├── Status: Live
│   └── Auto-deploy: Enabled
│
└── vizitka (Static Site)
    ├── URL: https://vizitka.onrender.com
    ├── Status: Live
    └── Auto-deploy: Enabled
```

## Полезные ссылки

- [Render Documentation](https://render.com/docs)
- [Render Static Sites](https://render.com/docs/static-sites)
- [Render Web Services](https://render.com/docs/web-services)
- [Render Free Tier](https://render.com/docs/free)

## Дополнительные настройки

### Использование custom domain

1. В настройках Static Site добавьте ваш домен
2. Настройте DNS записи согласно инструкциям Render
3. Обновите `FRONTEND_URL` на backend

### Мониторинг и логи

- Все логи доступны в Render Dashboard
- Можно настроить уведомления о падениях сервисов
- Доступна метрика использования ресурсов

