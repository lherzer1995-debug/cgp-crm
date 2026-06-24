# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

ARG CLERK_PUBLISHABLE
ENV npm_config_registry=https://registry.npmjs.org/
ENV npm_config_audit=false
ENV npm_config_fund=false

COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN VITE_CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE" npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV npm_config_registry=https://registry.npmjs.org/
ENV npm_config_audit=false
ENV npm_config_fund=false

COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8080
CMD ["node", "server/index.mjs"]
