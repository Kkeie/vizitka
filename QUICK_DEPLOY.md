# 🚀 Быстрый деплой на GitHub Pages + Render

## Frontend → GitHub Pages (5 минут)

1. **Создайте репозиторий на GitHub**

2. **Загрузите код:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ВАШ_USERNAME/ВАШ_РЕПОЗИТОРИЙ.git
   git push -u origin main
   ```

3. **Включите GitHub Pages:**
   - Settings → Pages → Source: **GitHub Actions**

4. **Добавьте секреты:**
   - Settings → Secrets → Actions
   - `VITE_BACKEND_API_URL` = `https://ваш-backend.onrender.com` (добавите после деплоя backend)

## Backend → Render (10 минут)

1. **Зарегистрируйтесь:** [render.com](https://render.com)

2. **Создайте Web Service:**
   - New + → Web Service
   - Подключите GitHub репозиторий
   - **Root Directory:** `backend` ⚠️
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

3. **Добавьте переменные:**
   ```
   DATABASE_PATH=/app/data/db.sqlite
   JWT_SECRET=сгенерируйте_случайную_строку_32_символа
   FRONTEND_URL=https://ваш-username.github.io/ваш-репозиторий
   NODE_ENV=production
   ```

4. **Скопируйте URL** после деплоя и обновите `VITE_BACKEND_API_URL` в GitHub секретах

## Готово! 🎉

Ваш сайт будет доступен по адресу:
- Frontend: `https://ваш-username.github.io/ваш-репозиторий`
- Backend: `https://ваш-backend.onrender.com`

---

📖 **Подробные инструкции:**
- `DEPLOY_RENDER.md` - детальная инструкция по Render
- `GITHUB_PAGES_DEPLOY.md` - полная инструкция по GitHub Pages

