# syntax=docker/dockerfile:1

# ── Stage 1: Build React/Vite app ──────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
ENV npm_config_registry=https://registry.npmjs.org/
ENV npm_config_audit=false
ENV npm_config_fund=false

COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Serve SPA with Caddy ──────────────────────────
FROM caddy:2-alpine AS runner

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 8080
