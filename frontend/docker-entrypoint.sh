#!/bin/sh
set -e

# Заменяем PORT в nginx.conf на значение из переменной окружения
# Если PORT не установлен, используем 80 по умолчанию
export PORT=${PORT:-80}

# Создаем конфигурацию nginx с подставленным PORT
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Проверяем, что конфигурация валидна
nginx -t

# Запускаем nginx
exec nginx -g "daemon off;"
