# Инструкция по деплою на различные хостинги

## Варианты деплоя

### Вариант 1: Vercel (Рекомендуется для фронтенда)

**Плюсы**: Бесплатный, быстрый, автоматический деплой из GitHub

#### Деплой фронтенда на Vercel:

1. **Подготовка**:
   - Зарегистрируйтесь на [vercel.com](https://vercel.com)
   - Подключите GitHub репозиторий

2. **Настройка проекта**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

3. **Переменные окружения**:
   ```
   VITE_BACKEND_API_URL=https://your-backend-url.com/api
   VITE_BASE_PATH=/
   ```

4. **Деплой**: Vercel автоматически задеплоит при каждом push в `main`

#### Деплой бэкенда на Vercel (Serverless):

Создайте файл `vercel.json` в корне проекта:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/src/server.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/server.ts"
    }
  ]
}
```

**Ограничение**: SQLite на Vercel не работает (read-only файловая система). Нужна внешняя БД (PostgreSQL, MongoDB и т.д.)

---

### Вариант 2: Railway (Рекомендуется для fullstack)

**Плюсы**: Простой деплой, поддержка Docker, PostgreSQL встроен

#### Деплой через Railway:

1. **Регистрация**: [railway.app](https://railway.app)

2. **Деплой бэкенда**:
   - **New Project** → **Deploy from GitHub repo**
   - Выберите репозиторий
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     DATABASE_URL=file:/app/data/dev.db
     JWT_SECRET=your-secret-key-here
     NODE_ENV=production
     PORT=3000
     ```

3. **Деплой фронтенда**:
   - **New Service** → **Deploy from GitHub repo**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - Railway автоматически определит статический сайт
   - **Environment Variables**:
     ```
     VITE_BACKEND_API_URL=https://your-backend.railway.app/api
     ```

4. **База данных** (опционально):
   - Railway предлагает PostgreSQL
   - Нужно будет адаптировать код для PostgreSQL вместо SQLite

---

### Вариант 3: Render

**Плюсы**: Бесплатный tier, простой деплой

#### Деплой на Render:

1. **Регистрация**: [render.com](https://render.com)

2. **Деплой бэкенда**:
   - **New** → **Web Service**
   - Подключите GitHub репозиторий
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     DATABASE_URL=file:/app/data/dev.db
     JWT_SECRET=your-secret-key
     NODE_ENV=production
     PORT=3000
     ```

3. **Деплой фронтенда**:
   - **New** → **Static Site**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     ```
     VITE_BACKEND_API_URL=https://your-backend.onrender.com/api
     ```

**Важно**: На бесплатном tier Render "засыпает" после 15 минут бездействия. Для production нужен платный план.

---

### Вариант 4: Fly.io (Docker)

**Плюсы**: Поддержка Docker, глобальная сеть, хорошая производительность

#### Деплой на Fly.io:

1. **Установка CLI**:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Логин**:
   ```bash
   fly auth login
   ```

3. **Деплой бэкенда**:
   ```bash
   cd backend
   fly launch
   ```
   - Следуйте инструкциям
   - Создайте `fly.toml` (автоматически):
   ```toml
   app = "your-backend-app"
   primary_region = "iad"
   
   [build]
     dockerfile = "Dockerfile"
   
   [env]
     DATABASE_URL = "file:/app/data/dev.db"
     JWT_SECRET = "your-secret-key"
     NODE_ENV = "production"
     PORT = "3000"
   
   [[services]]
     internal_port = 3000
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = 80
       force_https = true
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443
   ```

4. **Деплой фронтенда**:
   ```bash
   cd frontend
   fly launch
   ```
   - Настройте переменные окружения через `fly secrets set`:
   ```bash
   fly secrets set VITE_BACKEND_API_URL=https://your-backend.fly.dev/api
   ```

---

### Вариант 5: Netlify (Только фронтенд)

**Плюсы**: Отличный для статических сайтов, бесплатный CDN

#### Деплой фронтенда на Netlify:

1. **Регистрация**: [netlify.com](https://netlify.com)

2. **Деплой**:
   - **Add new site** → **Import an existing project**
   - Подключите GitHub репозиторий
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

3. **Environment Variables**:
   ```
   VITE_BACKEND_API_URL=https://your-backend-url.com/api
   VITE_BASE_PATH=/
   ```

4. **Netlify Redirects** (создайте `frontend/public/_redirects`):
   ```
   /*    /index.html   200
   ```

---

### Вариант 6: VPS (DigitalOcean, Hetzner, AWS EC2)

**Плюсы**: Полный контроль, можно использовать Docker Compose

#### Деплой на VPS:

1. **Подготовка сервера**:
   ```bash
   # Установка Docker и Docker Compose
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

2. **Клонирование репозитория**:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```

3. **Настройка переменных окружения**:
   Создайте `.env` файл:
   ```env
   DATABASE_URL=file:/app/data/dev.db
   JWT_SECRET=your-very-secret-key-here
   NODE_ENV=production
   ```

4. **Запуск через Docker Compose**:
   ```bash
   docker-compose up -d
   ```

5. **Настройка Nginx** (для фронтенда):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

6. **SSL сертификат** (Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

---

## Рекомендации по выбору

### Для быстрого старта:
- **Фронтенд**: Vercel или Netlify
- **Бэкенд**: Railway или Render

### Для production:
- **Fullstack**: Railway (платный план) или Fly.io
- **Или**: VPS с Docker Compose (больше контроля)

### Для бесплатного тестирования:
- **Фронтенд**: Vercel/Netlify (бесплатно)
- **Бэкенд**: Railway (бесплатный tier с ограничениями) или Render (с "засыпанием")

---

## Важные замечания

### База данных

Текущий проект использует SQLite (`better-sqlite3`). Это работает на:
- ✅ VPS с Docker
- ✅ Railway (с volume)
- ✅ Fly.io (с volume)
- ❌ Vercel (read-only файловая система)
- ❌ Netlify (только статика)

**Для production рекомендуется PostgreSQL**:
- Railway предоставляет PostgreSQL бесплатно
- Render предоставляет PostgreSQL бесплатно
- Можно использовать Supabase, Neon, или PlanetScale

### CORS настройки

Убедитесь, что бэкенд разрешает запросы с домена фронтенда:

```javascript
// backend/src/server.ts
import cors from 'cors';

app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'https://your-frontend.netlify.app',
    'http://localhost:5173' // для разработки
  ],
  credentials: true
}));
```

### Переменные окружения

Всегда используйте секреты/переменные окружения для:
- `JWT_SECRET` (должен быть случайным и секретным)
- `DATABASE_URL` (если используете внешнюю БД)
- API ключи (если используются)

---

## Быстрый старт (Railway - самый простой вариант)

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Выберите репозиторий
4. Railway автоматически определит структуру проекта
5. Настройте переменные окружения
6. Готово! 🚀
