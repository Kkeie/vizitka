FROM node:20-bullseye-slim AS base
WORKDIR /app

# Опционально: зеркало npm-реестра (передайте через build-arg)
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY" \
  && npm config set progress false \
  && npm config set fund false \
  && npm config set audit false

FROM base AS deps

# better-sqlite3 использует native addon. Prebuild обычно скачивается, но
# build toolchain нужен как fallback для стабильной Docker-сборки.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --cache /root/.npm \
  && npm cache verify

# --- build ---
FROM deps AS build
COPY package.json ./package.json          
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build                        

FROM deps AS prod-deps
RUN npm prune --omit=dev

# --- runtime ---
FROM base AS runtime

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/db.sqlite
ENV UPLOAD_DIR=/app/uploads

# package.json нужен для корректной работы некоторых инструментов (версии и т.п.)
COPY package.json ./package.json

# готовые production node_modules и сборка
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# стартовый скрипт
COPY start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

# Примечание: Volumes настраиваются через Railway веб-интерфейс
# Railway автоматически создаст volumes для /app/data и /app/uploads

EXPOSE 3000
CMD ["/app/start.sh"]
