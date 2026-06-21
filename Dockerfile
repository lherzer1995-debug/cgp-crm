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

# Build API with Prisma
RUN cd api && npx prisma generate --schema=../prisma/schema.prisma && npm run build

# Build Web
RUN cd web && npm run build

ENV NODE_ENV=production

# Startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "🚀 Starting CGP CRM..."' >> /app/start.sh && \
    echo 'echo "  → API on port 5000 (internal)"' >> /app/start.sh && \
    echo 'cd /app/api && node dist/main.js &' >> /app/start.sh && \
    echo 'echo "  → Next.js on port $PORT (public)"' >> /app/start.sh && \
    echo 'cd /app/web && npx next start -p "$PORT"' >> /app/start.sh && \
    chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
