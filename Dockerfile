# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
WORKDIR /app

RUN npm install -g npm@11.17.0

ENV npm_config_registry=https://registry.npmjs.org/
ENV npm_config_audit=false
ENV npm_config_fund=false

FROM base AS builder

ARG VITE_CLERK_PUBLISHABLE_KEY

COPY package.json .npmrc ./
RUN npm install --include=dev --no-audit --no-fund

COPY . .
RUN test -n "$VITE_CLERK_PUBLISHABLE_KEY" || (echo "Missing VITE_CLERK_PUBLISHABLE_KEY" && exit 1)
RUN VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY" npm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json .npmrc ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8080
CMD ["node", "server/index.mjs"]
