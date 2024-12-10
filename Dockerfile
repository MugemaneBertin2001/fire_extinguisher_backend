FROM node:21-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig*.json ./

RUN pnpm install

COPY . .

RUN pnpm run build 

FROM node:21-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /usr/src/app

# Only copy production-necessary files
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install 

EXPOSE 3000

# Simplified CMD for production
CMD ["pnpm", "run", "start:prod"]