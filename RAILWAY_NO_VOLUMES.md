# Решение без Volumes в Railway

## Проблема
В Railway нет опции Volumes в настройках (возможно, недоступна на бесплатном плане или изменился интерфейс).

## Решение: Использовать временную файловую систему

### Вариант 1: Использовать /tmp (временное хранилище)

⚠️ **ВНИМАНИЕ**: Данные будут теряться при каждом редеплое!

Но для тестирования это работает.

1. Измените переменную окружения:
   - Railway → Backend → Settings → Variables
   - `DATABASE_PATH=/tmp/db.sqlite` (вместо `/app/data/db.sqlite`)

2. Передеплойте бэкенд

### Вариант 2: Использовать PostgreSQL (рекомендуется для production)

Railway предоставляет PostgreSQL бесплатно:

1. Railway → **New** → **Database** → **PostgreSQL**
2. Railway автоматически создаст переменную `DATABASE_URL`
3. Нужно будет адаптировать код для использования PostgreSQL вместо SQLite

### Вариант 3: Использовать внешнюю БД

- Supabase (бесплатный PostgreSQL)
- Neon (бесплатный PostgreSQL)
- PlanetScale (бесплатный MySQL)

## Временное решение для тестирования

Я обновил `start.sh` чтобы создавать директории автоматически. Теперь:

1. **Убедитесь, что переменная установлена**:
   ```
   DATABASE_PATH=/app/data/db.sqlite
   ```

2. **Передеплойте бэкенд**

3. **Проверьте логи** - должны быть:
   ```
   [DB] Attempting to open database at: /app/data/db.sqlite
   [DB] Database opened successfully
   ```

⚠️ **Важно**: Без Volume данные будут теряться при каждом редеплое. Для production используйте PostgreSQL или внешнюю БД.
