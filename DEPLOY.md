# Инструкция по деплою на GitHub Pages

## Шаги для деплоя

### 1. Подготовка репозитория

1. Убедитесь, что ваш код находится в репозитории GitHub
2. Убедитесь, что у вас есть ветка `main` или `master` с актуальным кодом

### 2. Настройка GitHub Pages

1. Перейдите в **Settings** вашего репозитория
2. В левом меню выберите **Pages**
3. В разделе **Source** выберите:
   - **Source**: `GitHub Actions`
   - Это активирует автоматический деплой через workflow

### 3. Настройка переменных окружения (Secrets)

Если ваш бэкенд размещен отдельно, нужно настроить секреты:

1. Перейдите в **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **New repository secret** и добавьте:

   - **`VITE_BACKEND_URL`**: URL вашего бэкенда (например, `https://api.example.com`)
   - **`VITE_BACKEND_API_URL`**: Полный URL API бэкенда (например, `https://api.example.com/api`)
   - **`VITE_BASE_PATH`**: Базовый путь для GitHub Pages
     - Если репозиторий в корне: `/`
     - Если репозиторий называется `my-repo`: `/my-repo/`

### 4. Запуск деплоя

Деплой запустится автоматически при:
- Push в ветку `main` или `master`
- Или вручную через **Actions** → **Deploy to GitHub Pages** → **Run workflow**

### 5. Проверка деплоя

После успешного деплоя:
1. Перейдите в **Actions** и проверьте, что workflow завершился успешно
2. Ваш сайт будет доступен по адресу:
   - `https://<username>.github.io/<repo-name>/` (если репозиторий не в корне)
   - `https://<username>.github.io/` (если репозиторий называется `<username>.github.io`)

## Важные замечания

### Бэкенд должен быть размещен отдельно

GitHub Pages поддерживает только статические сайты. Ваш бэкенд нужно разместить отдельно:
- На VPS (например, через Docker)
- На платформе вроде Railway, Render, Fly.io
- На любом другом хостинге с поддержкой Node.js

### CORS настройки

Убедитесь, что ваш бэкенд разрешает запросы с домена GitHub Pages. Добавьте в настройки CORS:

```javascript
// Пример для Express.js
app.use(cors({
  origin: ['https://your-username.github.io', 'http://localhost:5173'],
  credentials: true
}));
```

### Переменные окружения

Если вы не настроили секреты, workflow будет использовать значения по умолчанию:
- `VITE_BACKEND_URL`: `https://your-backend-url.com`
- `VITE_BACKEND_API_URL`: `https://your-backend-url.com/api`
- `VITE_BASE_PATH`: `/`

**Важно**: Замените эти значения на реальные URL вашего бэкенда!

## Локальная разработка

Для локальной разработки создайте файл `.env` в папке `frontend/`:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_BACKEND_API_URL=http://localhost:3000/api
VITE_BASE_PATH=/
```

## Troubleshooting

### Сайт не загружается
- Проверьте, что workflow завершился успешно
- Проверьте настройки Pages в Settings
- Убедитесь, что `base` в `vite.config.ts` соответствует структуре репозитория

### API запросы не работают
- Проверьте, что `VITE_BACKEND_API_URL` настроен правильно
- Проверьте CORS настройки бэкенда
- Откройте DevTools → Network и проверьте ошибки запросов

### Стили не загружаются
- Убедитесь, что файл `.nojekyll` присутствует в `frontend/public/`
- Проверьте, что пути к ресурсам корректны (используйте относительные пути)
