FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
COPY api/package.json api/
COPY web/package.json web/

RUN cd api && npm install
RUN cd web && npm install

COPY . .

RUN cd api && npx prisma generate --schema=../prisma/schema.prisma && npm run build
RUN cd web && npm run build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["node", "api/dist/main.js"]
