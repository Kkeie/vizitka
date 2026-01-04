# Быстрый деплой Backend на Render (бесплатно)

## Шаг 1: Регистрация на Render

1. Перейдите на [render.com](https://render.com)
2. Зарегистрируйтесь через GitHub (рекомендуется)

## Шаг 2: Создание Web Service

1. Нажмите **"New +"** → **"Web Service"**
2. Подключите ваш GitHub репозиторий
3. Выберите репозиторий с проектом

## Шаг 3: Настройка сервиса

Заполните форму:

- **Name**: `bento-backend` (или любое другое имя)
- **Region**: Выберите ближайший регион (например, `Frankfurt` для Европы)
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **ВАЖНО!**
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: `Free` ✅

## Шаг 4: Переменные окружения

В разделе **"Environment Variables"** добавьте:

```
DATABASE_PATH = /app/data/db.sqlite
JWT_SECRET = ваш_случайный_секретный_ключ_минимум_32_символа
FRONTEND_URL = https://ваш-username.github.io/ваш-репозиторий
NODE_ENV = production
PORT = 3000
```

**Как сгенерировать JWT_SECRET:**
```bash
# В терминале
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Шаг 5: Деплой

1. Нажмите **"Create Web Service"**
2. Дождитесь завершения деплоя (обычно 5-10 минут)
3. После успешного деплоя скопируйте URL (например: `https://bento-backend.onrender.com`)

## Шаг 6: Обновление GitHub Actions

1. Перейдите в ваш GitHub репозиторий
2. Settings → Secrets and variables → Actions
3. Обновите секрет `VITE_BACKEND_API_URL` на URL вашего Render сервиса
4. Запустите workflow вручную или сделайте новый commit

## Важные замечания

⚠️ **На бесплатном плане Render:**
- Приложение "засыпает" после 15 минут бездействия
- Первый запрос после пробуждения может занять 30-60 секунд
- Это нормально для бесплатного плана

✅ **Преимущества Render:**
- Полностью бесплатный план
- Автоматический деплой из GitHub
- Простая настройка
- HTTPS из коробки

## Troubleshooting

### Проблема: Build failed

**Решение**: Проверьте логи в Render Dashboard. Убедитесь, что:
- Root Directory указан как `backend`
- Build Command правильный: `npm install && npm run build`
- В `backend/package.json` есть скрипт `build`

### Проблема: App crashed

**Решение**: 
1. Проверьте логи в Render Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте, что `JWT_SECRET` достаточно длинный (минимум 32 символа)

### Проблема: Database not found

**Решение**: 
- На Render файловая система эфемерная (файлы удаляются при перезапуске)
- Для production лучше использовать PostgreSQL (есть бесплатный план на Render)
- Или используйте внешнее хранилище для SQLite файла

### Проблема: CORS errors

**Решение**: 
1. Убедитесь, что `FRONTEND_URL` установлен правильно
2. Проверьте настройки CORS в `backend/src/app.ts`
3. URL должен быть точным (с `https://` и без слеша в конце)

## Альтернатива: Использование PostgreSQL на Render

Для production лучше использовать PostgreSQL вместо SQLite:

1. В Render создайте **PostgreSQL** базу данных (бесплатный план)
2. Получите `DATABASE_URL` из настроек базы
3. Обновите переменную окружения `DATABASE_URL` в вашем Web Service
4. Адаптируйте код для работы с PostgreSQL (потребуется изменить `backend/src/utils/db.ts`)

## Полезные ссылки

- [Render Documentation](https://render.com/docs)
- [Render Free Tier Limits](https://render.com/docs/free)
- [Node.js on Render](https://render.com/docs/node)

