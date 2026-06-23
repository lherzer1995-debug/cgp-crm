# ── Stage 1: Build ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --registry=https://registry.npmjs.org/ --no-audit --no-fund

COPY . .
RUN npm run build

# ── Stage 2: Serve with Caddy ──────────────────────────────
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 8080
