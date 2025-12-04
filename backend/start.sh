#!/bin/sh
set -e

# Создаем директории для базы данных и загрузок если их нет
mkdir -p /app/data
mkdir -p /app/uploads

echo "==> Starting server…"
node dist/server.js
