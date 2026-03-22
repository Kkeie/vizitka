# 🚀 Быстрый деплой на Render (Frontend + Backend)

## Backend (Web Service)

### Настройки:
- **Type**: Web Service
- **Name**: `vizitka-backend`
- **Language**: Node
- **Root Directory**: `backend` ⚠️
- **Build Command**: `NODE_ENV=development npm install && npm run build` ⚠️
- **Start Command**: `npm start`
- **Plan**: Free

### Environment Variables:
```
DATABASE_PATH=/app/data/db.sqlite
JWT_SECRET=сгенерируйте_32_символа
FRONTEND_URL=https://vizitka.onrender.com
NODE_ENV=production
PORT=3000
```

**После деплоя скопируйте URL backend!** (например: `https://vizitka-backend.onrender.com`)

---

## Frontend (Static Site)

### Настройки:
- **Type**: Static Site
- **Name**: `vizitka`
- **Root Directory**: `frontend` ⚠️
- **Build Command**: `NODE_ENV=development npm install && npm run build` ⚠️
- **Publish Directory**: `dist` ⚠️
- **Plan**: Free

### Environment Variables:
```
VITE_BACKEND_API_URL=https://vizitka-backend.onrender.com/api
VITE_BASE_PATH=/
```

⚠️ **Замените `vizitka-backend.onrender.com` на реальный URL вашего backend!**
⚠️ **Для `VITE_BACKEND_API_URL` обязателен суффикс `/api`**

---

## После деплоя обоих сервисов:

1. Обновите `FRONTEND_URL` в backend на реальный URL frontend
2. Проверьте работу сайта: `https://vizitka.onrender.com`

## Порядок деплоя:

1. ✅ Сначала деплойте **Backend**
2. ✅ Скопируйте URL backend
3. ✅ Деплойте **Frontend** с правильным `VITE_BACKEND_API_URL`
4. ✅ Обновите `FRONTEND_URL` в backend

---

📖 **Подробная инструкция**: `DEPLOY_RENDER_FULL.md`
