# Как узнать URL бэкенда в Railway

## Способ 1: Через веб-интерфейс Railway

1. **Откройте ваш проект** в Railway
2. **Нажмите на сервис Backend** (не на проект, а на сам сервис)
3. Перейдите во вкладку **Settings**
4. Прокрутите вниз до раздела **Networking**
5. Там будет **Public Domain** или **Generate Domain**
6. Скопируйте URL (например: `https://your-backend-production.up.railway.app`)

## Способ 2: Через вкладку Deployments

1. Откройте ваш Backend сервис
2. Перейдите во вкладку **Deployments**
3. Нажмите на последний успешный деплой
4. В разделе **Networking** будет показан **Public URL**

## Способ 3: Через Variables

1. Откройте Backend сервис → **Settings** → **Variables**
2. Railway автоматически создает переменную `RAILWAY_PUBLIC_DOMAIN`
3. Это и есть ваш URL бэкенда

## Важно

- URL будет выглядеть примерно так: `https://your-backend-production.up.railway.app`
- Для API запросов используйте: `https://your-backend-production.up.railway.app/api`
- Railway автоматически предоставляет HTTPS

## Проверка работы

Откройте в браузере:
```
https://your-backend-url.railway.app/api/health
```

Должен вернуться: `{"ok":true}`
