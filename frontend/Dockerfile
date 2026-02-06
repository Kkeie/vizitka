# --- build ---
FROM node:20-alpine AS build
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY" \
  && npm config set progress false \
  && npm config set fund false \
  && npm config set audit false

COPY package.json ./
RUN npm install --no-audit --no-fund --legacy-peer-deps --cache /root/.npm \
  && npm cache verify

COPY tsconfig.json ./tsconfig.json
COPY vite.config.ts ./vite.config.ts
COPY index.html ./index.html
COPY public ./public
COPY src ./src

RUN npm run build

# --- run ---
FROM nginx:alpine AS run

# Устанавливаем envsubst для подстановки переменных окружения
RUN apk add --no-cache gettext

# Копируем шаблон конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf.template

# Копируем статические файлы
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80

# Используем PORT из переменной окружения (Railway предоставляет его)
ENV PORT=80

# Создаем entrypoint скрипт прямо в образе
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo 'export PORT=${PORT:-80}' >> /docker-entrypoint.sh && \
    echo 'envsubst '"'"'${PORT}'"'"' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf' >> /docker-entrypoint.sh && \
    echo 'nginx -t' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
