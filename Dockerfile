FROM node:21-alpine AS build_production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig*.json ./

RUN pnpm install

COPY . .

RUN pnpm run build 

ENV NODE_ENV=production

EXPOSE 3000

CMD ["pnpm", "run", "start:prod"]