# Быстрое решение ошибки "npm: command not found" на Railway

## Проблема
Railway пытается использовать Docker вместо Nixpacks, и в Docker образе нет Node.js.

## Решение

### Шаг 1: Убедитесь, что используете Nixpacks

1. В Railway откройте **Settings** вашего сервиса
2. Найдите раздел **Build & Deploy**
3. Убедитесь, что **Builder** установлен на **Nixpacks** (не Docker!)
4. Если там Docker - переключите на Nixpacks

### Шаг 2: Правильно настройте Root Directory

1. В **Settings** → **Root Directory** укажите: `backend`
2. **Build Command** - оставьте ПУСТЫМ (Railway будет использовать `backend/nixpacks.toml`)
3. **Start Command** - оставьте ПУСТЫМ (Railway будет использовать `backend/nixpacks.toml`)

### Шаг 3: Пересоберите проект

1. В Railway нажмите **Deploy** или **Redeploy**
2. Railway должен автоматически использовать Nixpacks и найти `backend/nixpacks.toml`

## Альтернатива: Если Railway все равно использует Docker

Если Railway продолжает пытаться использовать Docker:

1. **Удалите Dockerfile из корня проекта** (если он есть)
2. Или переименуйте его: `mv Dockerfile Dockerfile.backup`
3. Railway должен автоматически переключиться на Nixpacks

## Проверка

После правильной настройки в логах Railway вы должны увидеть:
```
Detected Nixpacks
Using nixpacks.toml from backend/
Installing Node.js 20...
Running npm install...
Running npm run build...
```

Вместо:
```
Using Dockerfile...
```

---

## Если ничего не помогает

Используйте Railway CLI:

```bash
# Установите Railway CLI
npm i -g @railway/cli

# Войдите
railway login

# Перейдите в backend
cd backend

# Инициализируйте проект
railway init

# Убедитесь, что используется Nixpacks
railway variables set RAILWAY_BUILDER=nixpacks

# Задеплойте
railway up
```
