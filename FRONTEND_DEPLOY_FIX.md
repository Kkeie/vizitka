# Исправление деплоя Frontend на Railway

## Проблема
```
The executable `npx` could not be found
```

## Решение

Я исправил конфигурацию:

1. ✅ Изменил `frontend/railway.json` - теперь использует Dockerfile вместо Nixpacks
2. ✅ Добавил EXPOSE и CMD в Dockerfile для запуска nginx

## Что делать дальше

### В Railway:

1. **Убедитесь, что Root Directory установлен**: `frontend`
2. **Build Command**: оставьте пустым (используется Dockerfile)
3. **Start Command**: оставьте пустым (используется CMD из Dockerfile)
4. **Переменные окружения**:
   ```
   VITE_BACKEND_API_URL=https://your-backend.railway.app/api
   VITE_BASE_PATH=/
   ```

### Альтернатива: Использовать Railway Static Files

Если Dockerfile все еще вызывает проблемы:

1. **Удалите** `frontend/railway.json` (или переименуйте в `.bak`)
2. В Railway Settings:
   - **Service Type**: Static Files
   - **Output Directory**: `dist`
   - **Build Command**: `npm install && npm run build`
3. Railway автоматически задеплоит статический сайт

## Проверка

После успешного деплоя:
- Frontend будет доступен по URL от Railway
- Проверьте, что API запросы идут на правильный backend URL
- Откройте DevTools → Network и проверьте запросы
