FROM node:20-bullseye-slim AS base
WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY" \
  && npm config set progress false \
  && npm config set fund false \
  && npm config set audit false

FROM base AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --no-audit --no-fund --cache /root/.npm \
  && npm cache verify

# --- build ---
FROM deps AS build
COPY backend/package.json ./package.json
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
RUN npm run build                        

FROM deps AS prod-deps
RUN npm prune --omit=dev

# --- runtime ---
FROM base AS runtime

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/db.sqlite
ENV UPLOAD_DIR=/app/uploads

COPY backend/package.json ./package.json

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

COPY backend/start.sh /app/start.sh
RUN sed -i 's/\r$//' /app/start.sh && chmod +x /app/start.sh

EXPOSE 3000
CMD ["/app/start.sh"]
