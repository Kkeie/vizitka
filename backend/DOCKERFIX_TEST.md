# Инструкция по тестированию исправления Dockerfile

## Быстрый тест сборки

```bash
cd backend
docker build -t bento-backend:test .
```

## Ожидаемое поведение

### Успешная сборка:
1. **deps stage**: 
   - npm install выполнится с retry логикой (до 3 попыток)
   - Prisma engines НЕ будут скачаны (из-за `PRISMA_GENERATE_SKIP_AUTOINSTALL=1`)
   - Вы увидите логи: "npm install attempt #1", "attempt #2" и т.д. при ошибках

2. **build stage**:
   - `npx prisma generate` скачает движки (так как `PRISMA_GENERATE_SKIP_AUTOINSTALL=0`)
   - TypeScript компиляция пройдёт успешно

3. **runtime stage**:
   - Финальный образ будет создан

### Если сборка всё ещё падает:

#### Проверка логов npm:
```bash
# Сохранить логи сборки
docker build -t bento-backend:test . 2>&1 | tee build.log

# Или проверить логи внутри контейнера (если образ частично собран)
docker run --rm -it <image-id> cat /root/.npm/_logs/*.log
```

#### Проверка сетевых проблем:
```bash
# Проверить доступность npm registry
docker run --rm node:20-bullseye-slim sh -c "npm config get registry && curl -I https://registry.npmjs.org/"
```

#### Альтернативное решение (если проблема сохраняется):

1. **Увеличить retry параметры** в Dockerfile:
   - Изменить `fetch-retries` с 5 на 10
   - Увеличить `fetch-retry-maxtimeout` до 300000 (5 минут)

2. **Использовать зеркало npm** (если доступно):
   ```bash
   docker build --build-arg NPM_REGISTRY=https://your-mirror.com/ -t bento-backend:test .
   ```

3. **Полностью пропустить скачивание движков в build**:
   - Оставить `PRISMA_GENERATE_SKIP_AUTOINSTALL=1` в build stage
   - Движки скачаются при запуске через `start.sh` (уже есть `npx prisma generate`)

## Проверка размера образа

```bash
docker images bento-backend:test
```

Ожидаемый размер: ~200-400 MB (зависит от зависимостей)

## Тест запуска контейнера

```bash
# Запуск с временными томами
docker run --rm -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  bento-backend:test

# Проверка health endpoint
curl http://localhost:3000/api/health
```

## Откат изменений

Если нужно вернуться к исходной версии:
```bash
cd backend
cp Dockerfile.cursor.bak Dockerfile
```

