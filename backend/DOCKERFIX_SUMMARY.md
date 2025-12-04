# Исправление ошибки сборки Docker-образа (Prisma engines)

## Проблема
При сборке Docker-образа возникала ошибка:
```
npm error code 1 ... @prisma/engines ... node scripts/postinstall.js ... Error: aborted ... ECONNRESET
```

Причина: нестабильная сеть при скачивании Prisma engines во время `npm install`.

## Внесённые изменения

### 1. Резервная копия
Создана резервная копия: `Dockerfile.cursor.bak`

### 2. Патч в `backend/Dockerfile`

#### Изменения в stage `deps`:
- **Добавлена переменная окружения**: `PRISMA_GENERATE_SKIP_AUTOINSTALL=1`
  - Пропускает автоскачивание Prisma engines во время `npm install`
  - Уменьшает риск сетевых ошибок на этапе установки зависимостей

- **Настройки npm для retry**:
  - `fetch-retries: 5` — до 5 попыток повтора
  - `fetch-retry-factor: 10` — экспоненциальный множитель
  - `fetch-retry-mintimeout: 20000` — минимум 20 секунд между попытками
  - `fetch-retry-maxtimeout: 120000` — максимум 120 секунд между попытками
  - Примечание: `unsafe-perm` не нужен в Docker под root (удалён из конфигурации)

- **Retry loop для `npm install`**:
  - До 3 попыток с экспоненциальным backoff (5s, 10s, 15s)
  - Логирование каждой попытки
  - Выход с ошибкой, если все попытки неудачны

#### Изменения в stage `build`:
- **Сброс переменной**: `PRISMA_GENERATE_SKIP_AUTOINSTALL=0`
  - Позволяет `npx prisma generate` скачать движки на этапе сборки
  - На этом этапе сеть обычно стабильнее

## Варианты деплоя

### Вариант A: Бинарники в образе (рекомендуется для production)
**Текущая конфигурация** — движки скачиваются в build stage через `npx prisma generate`.

**Преимущества**:
- Образ самодостаточен
- Не требует сетевого доступа при запуске контейнера

**Недостатки**:
- Больший размер образа
- Требует стабильной сети при сборке

### Вариант B: Генерация при запуске (для нестабильной сети при сборке)
Если сборка всё ещё падает, можно генерировать движки при запуске:

1. Оставьте `PRISMA_GENERATE_SKIP_AUTOINSTALL=1` в deps stage
2. Убедитесь, что `start.sh` выполняет `npx prisma generate` (уже есть)
3. Контейнер скачает движки при первом запуске

**Преимущества**:
- Сборка образа быстрее и надёжнее
- Движки скачиваются при деплое (когда сеть стабильна)

**Недостатки**:
- Первый запуск медленнее
- Требует сетевого доступа при запуске

### Вариант C: Предзагруженные движки (для airgapped окружений)
Для полностью офлайн окружений:

1. Предзагрузите Prisma engines в приватный artifact store
2. Настройте `PRISMA_QUERY_ENGINE_BINARY` и другие переменные окружения
3. Или используйте `schema.prisma` с указанием локальных путей

См. документацию Prisma: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker

## Тестирование

### Локальная сборка
```bash
cd backend
docker build -t bento-backend:test .
```

### Проверка логов
Если сборка всё ещё падает, проверьте логи:
```bash
docker build -t bento-backend:test . 2>&1 | tee build.log
```

Или проверьте логи npm внутри контейнера (если нужно):
```bash
docker run --rm -it <image-id> cat /root/.npm/_logs/*.log
```

### Проверка размера образа
```bash
docker images bento-backend:test
```

## Ссылки
- GitHub issue: https://github.com/prisma/prisma/issues/26809
- Prisma Docker guide: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker
- npm config docs: https://docs.npmjs.com/cli/v9/using-npm/config

## Откат изменений
Если нужно вернуться к исходной версии:
```bash
cd backend
cp Dockerfile.cursor.bak Dockerfile
```

