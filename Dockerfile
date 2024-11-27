FROM node:21-alpine as build 

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/fire_extinguisher_bn

COPY package*.json ./ 
COPY pnpm-lock.yaml ./
COPY tsconfig*.json ./

RUN pnpm install

COPY . .

ENV NODE_ENV=${NODE_ENV}

RUN pnpm run build 

FROM node:21-alpine as production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/fire_extinguisher_bn

COPY --from=build /usr/src/fire_extinguisher_bn/node_modules ./node_modules
COPY --from=build /usr/src/fire_extinguisher_bn/dist ./dist
COPY --from=build /usr/src/fire_extinguisher_bn/package.json ./package.json
COPY --from=build /usr/src/fire_extinguisher_bn/tsconfig*.json ./

EXPOSE 3000 

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"prod\" ]; then pnpm run start:prod; else pnpm run start:dev; fi"]