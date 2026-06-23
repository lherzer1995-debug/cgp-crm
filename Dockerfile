# ── Stage 1: Build ─────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Use public npm registry directly (bypass internal proxies)
ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

COPY package.json package-lock.json ./
RUN npm install -g npm@11.17.0 && npm install --ignore-scripts --no-audit --no-fund --loglevel=warn

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
