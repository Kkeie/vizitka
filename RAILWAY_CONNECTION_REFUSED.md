# Исправление ошибки "connection refused" на Railway

## Проблема
```
"error":"connection refused"
"upstreamAddress":""
```

Railway не может подключиться к контейнеру бэкенда.

## Возможные причины

### 1. Сервер не запускается из-за ошибки базы данных

**Проверка**: Railway → Backend → Deployments → Logs

Ищите ошибки:
- `[DB] Failed to open database`
- `SQLITE_CANTOPEN`
- `[DB] Failed to initialize database`

**Решение**: Создайте Volume с Mount Path `/app/data`

### 2. Сервер падает при старте

**Проверка**: В логах должна быть строка `[SERVER] Server started successfully`

Если её нет - сервер не запустился.

**Решение**: Проверьте логи на ошибки

### 3. Неправильный PORT

**Проверка**: Railway автоматически устанавливает PORT через переменную окружения

**Решение**: Убедитесь, что в коде используется `process.env.PORT || 3000`

### 4. Контейнер завершается сразу после старта

**Проверка**: В логах должно быть сообщение о запуске сервера

**Решение**: Проверьте, что `start.sh` правильно запускает сервер

## Пошаговое решение

### Шаг 1: Проверьте логи бэкенда

1. Railway → Backend → Deployments → последний деплой → Logs
2. Прокрутите до конца логов
3. Ищите:
   - ✅ `[SERVER] Server started successfully` - сервер запустился
   - ❌ Ошибки (красным) - сервер не запустился

### Шаг 2: Создайте Volume

Если Volume не создан:

1. Railway → Backend → Settings → Volumes
2. + New Volume
3. Mount Path: `/app/data`
4. Size: 1 GB
5. Передеплойте бэкенд

### Шаг 3: Проверьте переменные окружения

Railway → Backend → Settings → Variables

Должны быть:
```
DATABASE_PATH=/app/data/db.sqlite
NODE_ENV=production
PORT=3000
JWT_SECRET=ваш-секретный-ключ
```

**ВАЖНО**: Не устанавливайте PORT вручную! Railway устанавливает его автоматически.

### Шаг 4: Проверьте start.sh

Убедитесь, что `backend/start.sh` существует и содержит:
```bash
#!/bin/sh
set -e
echo "==> Starting server…"
node dist/server.js
```

### Шаг 5: Передеплойте бэкенд

После создания Volume и проверки переменных:

1. Railway → Backend → Deployments → Redeploy
2. Дождитесь завершения деплоя
3. Проверьте логи - должны быть сообщения об успешном запуске

## Что должно быть в логах после успешного запуска:

```
[DB] Attempting to open database at: /app/data/db.sqlite
[DB] Database opened successfully
[DB] Database initialized successfully at: /app/data/db.sqlite
[SERVER] Server started successfully on http://localhost:3000
[SERVER] Environment: production
[SERVER] Database path: /app/data/db.sqlite
```

## Если ошибка продолжается:

1. Скопируйте последние 50 строк логов бэкенда
2. Проверьте, есть ли ошибки при инициализации базы данных
3. Убедитесь, что Volume создан и смонтирован правильно
4. Попробуйте пересоздать Volume (удалить старый и создать новый)
