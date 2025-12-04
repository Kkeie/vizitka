FROM node:20-bullseye-slim AS deps
WORKDIR /app

# Опционально: зеркало npm-реестра (передайте через build-arg)
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY" \
  && npm config set progress false \
  && npm config set fund false \
  && npm config set audit false

COPY package.json package-lock.json* ./
# Устанавливаем зависимости (без lock-файла используем install)
RUN npm install --no-audit --no-fund --cache /root/.npm \
  && npm cache verify

# --- build ---
FROM node:20-bullseye-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./package.json          
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build                        

# --- runtime ---
FROM node:20-bullseye-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/db.sqlite

# package.json нужен для корректной работы некоторых инструментов (версии и т.п.)
COPY package.json ./package.json

# готовые node_modules (prod) и сборки
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# стартовый скрипт
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Примечание: Volumes настраиваются через Railway веб-интерфейс
# Railway автоматически создаст volumes для /app/data и /app/uploads

EXPOSE 3000
CMD ["/app/start.sh"]
