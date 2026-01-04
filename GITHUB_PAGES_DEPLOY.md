# Деплой на GitHub Pages

Этот проект состоит из frontend (React) и backend (Node.js). GitHub Pages поддерживает только статические сайты, поэтому:

- **Frontend** → GitHub Pages (бесплатно)
- **Backend** → Отдельный хостинг (Railway, Render, Heroku и т.д.)

## Шаг 1: Подготовка репозитория

1. Создайте репозиторий на GitHub (если еще не создан)
2. Загрузите код в репозиторий:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/ВАШ_USERNAME/ВАШ_РЕПОЗИТОРИЙ.git
   git push -u origin main
   ```

## Шаг 2: Настройка GitHub Actions для автоматического деплоя

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build
        working-directory: ./frontend
        env:
          VITE_BACKEND_API_URL: ${{ secrets.VITE_BACKEND_API_URL || 'https://your-backend-url.com' }}
          VITE_BASE_PATH: ${{ secrets.VITE_BASE_PATH || '/' }}
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend/dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

## Шаг 3: Настройка переменных окружения

1. Перейдите в Settings → Secrets and variables → Actions
2. Добавьте секреты:
   - `VITE_BACKEND_API_URL` - URL вашего backend (например: `https://your-app.railway.app`)
   - `VITE_BASE_PATH` - базовый путь (если репозиторий не в корне, укажите `/repo-name/`, иначе `/`)

## Шаг 4: Включение GitHub Pages

1. Перейдите в Settings → Pages
2. В разделе "Source" выберите "GitHub Actions"
3. Сохраните изменения

## Шаг 5: Деплой Backend

Backend нужно задеплоить отдельно. Варианты бесплатных сервисов:

### Вариант A: Render (рекомендуется, бесплатный план)

1. Зарегистрируйтесь на [Render.com](https://render.com) (бесплатный план доступен)
2. Нажмите "New +" → "Web Service"
3. Подключите ваш GitHub репозиторий
4. Настройки:
   - **Name**: `bento-backend` (или любое другое имя)
   - **Region**: Выберите ближайший регион
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (бесплатный план)
5. Добавьте переменные окружения (Environment Variables):
   - `DATABASE_PATH=/app/data/db.sqlite`
   - `JWT_SECRET=ваш_секретный_ключ_минимум_32_символа`
   - `FRONTEND_URL=https://ваш-username.github.io/ваш-репозиторий`
   - `NODE_ENV=production`
6. Нажмите "Create Web Service"
7. После деплоя скопируйте URL (например: `https://bento-backend.onrender.com`)
8. Обновите `VITE_BACKEND_API_URL` в секретах GitHub Actions

**Примечание**: На бесплатном плане Render приложения "засыпают" после 15 минут бездействия. Первый запрос может занять 30-60 секунд для пробуждения.

### Вариант B: Fly.io (бесплатный план с ограничениями)

1. Установите Fly CLI: 
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # Mac/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. Зарегистрируйтесь: `fly auth signup`

3. В папке `backend` создайте файл `fly.toml`:
   ```toml
   app = "bento-backend"
   primary_region = "iad"
   
   [build]
     builder = "paketobuildpacks/builder:base"
   
   [http_service]
     internal_port = 3000
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
     processes = ["app"]
   
   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

4. Создайте приложение:
   ```bash
   cd backend
   fly launch --no-deploy
   ```

5. Добавьте переменные окружения:
   ```bash
   fly secrets set DATABASE_PATH=/app/data/db.sqlite
   fly secrets set JWT_SECRET=ваш_секретный_ключ
   fly secrets set FRONTEND_URL=https://ваш-username.github.io/ваш-репозиторий
   fly secrets set NODE_ENV=production
   ```

6. Задеплойте:
   ```bash
   fly deploy
   ```

7. После деплоя URL будет: `https://bento-backend.fly.dev`

### Вариант C: Cyclic.sh (полностью бесплатный)

1. Зарегистрируйтесь на [Cyclic.sh](https://cyclic.sh)
2. Нажмите "Deploy Now"
3. Подключите GitHub репозиторий
4. Настройки:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Добавьте переменные окружения в настройках проекта
6. После деплоя URL будет: `https://ваш-проект.cyclic.app`

### Вариант D: Koyeb (бесплатный план)

1. Зарегистрируйтесь на [Koyeb.com](https://www.koyeb.com)
2. Нажмите "Create App"
3. Подключите GitHub репозиторий
4. Настройки:
   - **Type**: Web Service
   - **Buildpack**: Node.js
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Run Command**: `npm start`
5. Добавьте переменные окружения
6. После деплоя URL будет: `https://ваш-проект.koyeb.app`

### Вариант E: Vercel (для serverless, может потребоваться адаптация)

1. Зарегистрируйтесь на [Vercel.com](https://vercel.com)
2. Импортируйте репозиторий
3. Настройки:
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Добавьте переменные окружения
5. **Примечание**: Vercel работает как serverless, может потребоваться адаптация кода

### Рекомендация

**Render** — самый простой вариант с хорошим бесплатным планом. Просто подключите репозиторий и настройте переменные окружения.

## Шаг 6: Обновление frontend для работы с backend

После деплоя backend обновите `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  // ... остальная конфигурация
});
```

И обновите `frontend/src/api.ts`:

```typescript
const API = import.meta.env.VITE_BACKEND_API_URL || "/api";
```

## Шаг 7: Настройка CORS на backend

Убедитесь, что в `backend/src/app.ts` настроен CORS для вашего GitHub Pages домена:

```typescript
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : true,
  credentials: true,
  // ...
};
```

## Шаг 8: Проверка деплоя

1. После push в main ветку GitHub Actions автоматически соберет и задеплоит frontend
2. Проверьте Actions tab в репозитории для отслеживания процесса
3. После успешного деплоя ваш сайт будет доступен по адресу:
   - `https://ваш-username.github.io/ваш-репозиторий` (если репозиторий не в корне)
   - `https://ваш-username.github.io` (если репозиторий называется `username.github.io`)

## Troubleshooting

### Проблема: 404 при переходе на страницы

**Решение**: Добавьте файл `frontend/public/_redirects` (для Netlify) или настройте `404.html` для GitHub Pages:

Создайте `frontend/public/404.html`:
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      sessionStorage.redirect = location.href;
    </script>
    <meta http-equiv="refresh" content="0;URL='/index.html'">
  </head>
  <body></body>
</html>
```

### Проблема: API запросы не работают

**Решение**: 
1. Проверьте `VITE_BACKEND_API_URL` в секретах GitHub Actions
2. Убедитесь, что backend задеплоен и доступен
3. Проверьте CORS настройки на backend
4. Проверьте консоль браузера на ошибки

### Проблема: Изображения не загружаются

**Решение**: 
1. Убедитесь, что backend правильно отдает статические файлы из `/uploads`
2. Проверьте, что URL изображений начинаются с `/uploads/` или полного URL backend

## Дополнительные настройки

### Использование custom domain

1. В Settings → Pages добавьте ваш домен
2. Настройте DNS записи согласно инструкциям GitHub
3. Обновите `FRONTEND_URL` на backend

### Оптимизация производительности

- Включите кэширование в GitHub Pages (автоматически)
- Используйте CDN для статических ресурсов
- Оптимизируйте изображения перед загрузкой

## Структура файлов для деплоя

```
.github/
  workflows/
    deploy.yml          # GitHub Actions workflow
frontend/
  public/
    404.html           # Редирект для SPA (опционально)
  dist/                # Собранный frontend (генерируется автоматически)
backend/               # Деплоится отдельно на Railway/Render/Heroku
```

## Полезные ссылки

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)

