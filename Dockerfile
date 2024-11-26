FROM node:18-alpine as build 

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/fire_extinguisher_bn 

COPY package*.json ./
COPY pnpm-lock.yaml ./ 
RUN pnpm install

COPY . .
RUN pnpm run build 

FROM node:18-alpine as production 

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/fire_extinguisher_bn 

COPY --from=build /usr/src/fire_extinguisher_bn/node_modules ./node_modules
COPY --from=build /usr/src/fire_extinguisher_bn/dist ./dist
COPY --from=build /usr/src/fire_extinguisher_bn/package.json ./package.json 

EXPOSE 3000 

CMD ["pnpm", "start:prod"]
