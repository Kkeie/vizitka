# Исправление ошибки TypeScript при сборке на Render

## Проблема

TypeScript не может найти типы (`@types/*`), потому что на Render в production режиме не устанавливаются `devDependencies`.

## Решение

Измените **Build Command** в настройках вашего Web Service на Render:

### Вариант 1 (рекомендуется):

```
NODE_ENV=development npm install && npm run build
```

### Вариант 2:

```
npm ci --include=dev && npm run build
```

### Вариант 3:

```
npm install --include=dev && npm run build
```

## Где изменить:

1. Перейдите в ваш Web Service на Render
2. Откройте **Settings**
3. Найдите раздел **Build & Deploy**
4. Измените **Build Command** на один из вариантов выше
5. Сохраните изменения
6. Render автоматически перезапустит деплой

## Альтернативное решение (если не помогло)

Можно переместить типы в `dependencies` вместо `devDependencies`, но это не рекомендуется для production.

