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
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
