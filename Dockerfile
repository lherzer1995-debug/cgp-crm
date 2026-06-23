# ── Stage 1: Build ─────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Force public registry in npm command (Docker builder ignores .npmrc)
COPY package.json package-lock.json ./
RUN npm install -g npm@11.17.0 --registry=https://registry.npmjs.org/ && \
    npm install --registry=https://registry.npmjs.org/ --ignore-scripts --no-audit --no-fund --loglevel=warn

COPY . .
RUN npm run build

# ── Stage 2: Serve with Nginx ──────────────────────────────
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
