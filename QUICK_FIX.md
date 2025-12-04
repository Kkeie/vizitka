# БЫСТРОЕ ИСПРАВЛЕНИЕ: Запросы идут на фронтенд + Бэкенд 502

## Проблема 1: Запросы идут на фронтенд

**Симптом**: `POST https://fortunate-rejoicing-production.up.railway.app/api/auth/register 405`

**Причина**: Переменная `VITE_BACKEND_API_URL` не установлена в Railway для фронтенда.

### РЕШЕНИЕ:

1. **Узнайте URL бэкенда**:
   - Railway → Backend сервис → Settings → Networking
   - Скопируйте Public Domain (например: `https://vizitka-production.up.railway.app`)

2. **Установите переменную для фронтенда**:
   - Railway → **Frontend сервис** → Settings → Variables
   - + New Variable
   - Name: `VITE_BACKEND_API_URL`
   - Value: `https://vizitka-production.up.railway.app/api` (замените на ваш URL!)
   - ⚠️ **ВАЖНО**: URL должен заканчиваться на `/api`

3. **ПЕРЕДЕПЛОЙТЕ фронтенд**:
   - Railway → Frontend → Deployments → **Redeploy**
   - Или дождитесь автоматического редеплоя

4. **Проверьте в браузере**:
   - F12 → Console
   - Должны быть логи: `[API] Backend URL: https://vizitka-production.up.railway.app/api`
   - Если видите `[API] WARNING: VITE_BACKEND_API_URL not set!` - переменная не установлена

---

## Проблема 2: Бэкенд возвращает 502

**Симптом**: `https://vizitka-production.up.railway.app/api/health` → 502

**Причина**: Бэкенд не запущен или есть ошибка при запуске.

### РЕШЕНИЕ:

1. **Проверьте логи бэкенда**:
   - Railway → Backend сервис → Deployments → последний деплой → Logs
   - Ищите ошибки (красным цветом)

2. **Создайте Volume для базы данных**:
   - Railway → Backend → Settings → Volumes
   - + New Volume
   - Mount Path: `/app/data`
   - Size: 1 GB
   - Сохраните и передеплойте бэкенд

3. **Проверьте переменные окружения**:
   - Railway → Backend → Settings → Variables
   - Должны быть:
     ```
     DATABASE_PATH=/app/data/db.sqlite
     NODE_ENV=production
     PORT=3000
     JWT_SECRET=ваш-секретный-ключ-минимум-32-символа
     ```

4. **Проверьте логи на наличие**:
   - `[DB] Database opened successfully`
   - `[DB] Database initialized successfully`
   - `[SERVER] Server started successfully on http://localhost:3000`

5. **Если есть ошибки**:
   - `SQLITE_CANTOPEN` → создайте Volume
   - `Cannot find module` → проверьте package.json
   - `[DB] Failed to initialize database` → проверьте логи на конкретную ошибку

---

## Чеклист для исправления:

- [ ] Переменная `VITE_BACKEND_API_URL` установлена в Railway для фронтенда
- [ ] Фронтенд передеплоен после установки переменной
- [ ] Volume создан для бэкенда (Mount Path: `/app/data`)
- [ ] Переменные окружения установлены для бэкенда
- [ ] Бэкенд передеплоен после создания Volume
- [ ] В логах бэкенда нет ошибок
- [ ] `https://vizitka-production.up.railway.app/api/health` возвращает `{"ok":true}`

---

## После исправления:

1. Проверьте бэкенд: `https://vizitka-production.up.railway.app/api/health` → должен быть `{"ok":true}`
2. Проверьте фронтенд: Console браузера → должен быть правильный URL бэкенда
3. Попробуйте зарегистрироваться → должно работать!
