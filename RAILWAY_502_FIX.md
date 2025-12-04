# Исправление ошибки 502 на бэкенде

## Проблема
Ошибка 502 означает, что бэкенд не запущен или не отвечает.

## Возможные причины

### 1. База данных не может быть создана (нет Volume)

**Симптомы**: В логах ошибки о невозможности создать файл базы данных

**Решение**:
1. Railway → Backend сервис → Settings → Volumes
2. + New Volume
3. Mount Path: `/app/data`
4. Size: 1 GB
5. Передеплойте бэкенд

### 2. Ошибка при инициализации базы данных

**Проверка**: Railway → Backend → Deployments → последний деплой → Logs

Ищите ошибки типа:
- `[DB] Failed to initialize database`
- `SQLITE_CANTOPEN`
- `ENOENT`

**Решение**: Создайте Volume (см. выше)

### 3. Сервер не запускается

**Проверка**: В логах должна быть строка `Server on http://localhost:3000`

Если её нет - сервер не запустился.

**Решение**: Проверьте логи на ошибки

### 4. Неправильный PORT

**Проверка**: Railway автоматически устанавливает PORT, но убедитесь что в переменных окружения:
```
PORT=3000
```

## Пошаговая диагностика

### Шаг 1: Проверьте логи бэкенда

1. Railway → Backend сервис → Deployments
2. Откройте последний деплой
3. Перейдите в Logs
4. Ищите:
   - `[DB] Database initialized successfully`
   - `Server on http://localhost:3000`
   - Ошибки (красным цветом)

### Шаг 2: Проверьте переменные окружения

Railway → Backend → Settings → Variables

Должны быть:
```
DATABASE_PATH=/app/data/db.sqlite
NODE_ENV=production
PORT=3000
JWT_SECRET=ваш-секретный-ключ
```

### Шаг 3: Создайте Volume

Если Volume не создан:

1. Settings → Volumes → + New Volume
2. Mount Path: `/app/data`
3. Size: 1 GB
4. Передеплойте бэкенд

### Шаг 4: Проверьте health endpoint

После передеплоя попробуйте:
```
https://vizitka-production.up.railway.app/api/health
```

Должен вернуться: `{"ok":true}`

## Частые ошибки в логах

### `SQLITE_CANTOPEN: unable to open database file`
**Решение**: Создайте Volume с Mount Path `/app/data`

### `EADDRINUSE: address already in use`
**Решение**: Railway автоматически управляет PORT, не устанавливайте его вручную

### `Cannot find module`
**Решение**: Проверьте, что все зависимости установлены в `package.json`

### `[DB] Failed to initialize database`
**Решение**: Проверьте логи на конкретную ошибку SQL

## Если ничего не помогает

1. Пересоздайте Volume (удалите старый и создайте новый)
2. Передеплойте бэкенд
3. Проверьте логи сразу после деплоя
4. Убедитесь, что переменные окружения установлены правильно
