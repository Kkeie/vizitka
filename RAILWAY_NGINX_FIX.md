# Исправление ошибки "Application failed to respond"

## Проблема
Railway показывает ошибку "Application failed to respond" после успешной сборки фронтенда.

## Причина
Nginx не настроен для использования переменной PORT, которую предоставляет Railway.

## Решение

Я исправил конфигурацию:

1. ✅ Создан `docker-entrypoint.sh` - скрипт для подстановки PORT в nginx.conf
2. ✅ Обновлен `nginx.conf` - теперь использует `${PORT}` вместо жестко заданного порта 80
3. ✅ Обновлен `Dockerfile` - устанавливает `gettext` для `envsubst` и использует entrypoint скрипт

## Как это работает

1. Railway предоставляет переменную окружения `PORT`
2. `docker-entrypoint.sh` заменяет `${PORT}` в `nginx.conf.template` на реальное значение
3. Nginx запускается на правильном порту

## Проверка

После деплоя проверьте:

1. **Логи Railway**: Должны показать успешный запуск nginx
2. **URL фронтенда**: Должен открываться без ошибок
3. **Health check**: `https://your-frontend.railway.app/health` должен вернуть "healthy"

## Если ошибка повторяется

### Вариант 1: Проверьте переменную PORT

В Railway Settings → Variables убедитесь, что `PORT` не установлен вручную (Railway устанавливает его автоматически).

### Вариант 2: Используйте Railway Static Files

Если Dockerfile продолжает вызывать проблемы:

1. Удалите `frontend/railway.json`
2. В Railway Settings:
   - **Service Type**: Static Files
   - **Output Directory**: `dist`
   - **Build Command**: `npm install && npm run build`

Railway автоматически задеплоит статический сайт без необходимости в nginx.

### Вариант 3: Проверьте логи

В Railway откройте вкладку **Deployments** → последний деплой → **Logs** и проверьте ошибки.
