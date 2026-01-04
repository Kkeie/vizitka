# Исправление ошибки "Root directory backend does not exist"

## Проблема

Render не может найти папку `backend` при клонировании репозитория.

## Решения

### Решение 1: Проверьте ветку в Render

1. В настройках вашего Web Service на Render
2. Проверьте поле **"Branch"**
3. Убедитесь, что указана правильная ветка:
   - Если у вас ветка `master` → укажите `master`
   - Если у вас ветка `main` → укажите `main`

### Решение 2: Убедитесь что все файлы закоммичены

Выполните в терминале:

```bash
# Проверьте статус
git status

# Если есть незакоммиченные файлы, добавьте их
git add .
git commit -m "Add backend files for Render deploy"

# Запушьте в репозиторий
git push origin master
# или
git push origin main
```

### Решение 3: Проверьте что папка backend в репозитории

```bash
# Проверьте что папка backend есть в git
git ls-files backend/ | Select-Object -First 5

# Должны быть файлы типа:
# backend/package.json
# backend/src/app.ts
# и т.д.
```

### Решение 4: Переименуйте ветку master в main (опционально)

Если хотите использовать `main` вместо `master`:

```bash
# Переименуйте локальную ветку
git branch -m master main

# Запушьте новую ветку
git push -u origin main

# Удалите старую ветку на GitHub (опционально)
git push origin --delete master
```

Затем в Render укажите ветку `main`.

### Решение 5: Проверьте Root Directory

В настройках Render убедитесь что:
- **Root Directory** указан как `backend` (без слешей в начале/конце)
- Не `./backend` или `/backend`, а просто `backend`

## Быстрая проверка

1. ✅ Откройте ваш репозиторий на GitHub
2. ✅ Убедитесь что папка `backend` видна в репозитории
3. ✅ Проверьте какая ветка активна (master или main)
4. ✅ В Render укажите правильную ветку
5. ✅ Убедитесь что Root Directory = `backend` (без слешей)

## После исправления

1. Сохраните настройки в Render
2. Render автоматически перезапустит деплой
3. Проверьте логи в Render Dashboard

