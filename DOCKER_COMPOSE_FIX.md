# Исправление для Docker Compose

## Проблема
В docker-compose фронтенд работает через nginx (production build), и запросы к `/api` не проксировались на бэкенд.

## Решение
Добавлено проксирование в `nginx.conf`:
- `/api` → проксируется на `backend:3000`
- `/uploads` → проксируется на `backend:3000`

## Как пересобрать

```bash
# Остановите текущие контейнеры
docker-compose down

# Пересоберите образы
docker-compose build

# Запустите заново
docker-compose up
```

Или одной командой:
```bash
docker-compose down && docker-compose build && docker-compose up
```

## Проверка

1. Откройте `http://localhost:8080` (фронтенд)
2. Откройте `http://localhost:3000/api/health` (бэкенд напрямую) - должно вернуться `{"ok":true}`
3. Войдите/зарегистрируйтесь на фронтенде
4. Перейдите на `/editor` - данные должны загрузиться

## Отладка

Если проблема сохраняется:

1. Проверьте логи бэкенда:
   ```bash
   docker-compose logs backend
   ```

2. Проверьте логи фронтенда:
   ```bash
   docker-compose logs frontend
   ```

3. Проверьте, что контейнеры запущены:
   ```bash
   docker-compose ps
   ```

4. Проверьте сеть docker-compose:
   ```bash
   docker network ls
   docker network inspect <network_name>
   ```

5. Откройте консоль браузера (F12) и проверьте логи `[API]`

