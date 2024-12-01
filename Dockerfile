FROM node:21-alpine as build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/build_fire_extinguisher_bn

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig*.json ./

RUN pnpm install

COPY . .

RUN pnpm run build 

FROM node:21-alpine as development

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/dev_fire_extinguisher_bn

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig*.json ./

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "pnpm run build && if [ \"$NODE_ENV\" = \"prod\" ]; then pnpm run start:prod; else pnpm run start:dev; fi"]


