FROM node:22-alpine

RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Install dependencies
COPY package.json ./
COPY api/package.json api/
COPY web/package.json web/

RUN cd api && npm install
RUN cd web && npm install

# Copy source
COPY . .

# Build
RUN cd api && npx prisma generate --schema=../prisma/schema.prisma && npm run build
RUN cd web && npm run build

ENV NODE_ENV=production

# Startup script: API on :5000 (internal), Next.js on $PORT (public)
RUN printf '#!/bin/sh\n\
  echo "Starting API on port 5000..."\n\
  cd /app/api && node dist/main.js &\n\
  echo "Starting Next.js on port $PORT..."\n\
  cd /app/web && npx next start -p "$PORT"\n' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 3000

CMD ["sh", "/app/start.sh"]
