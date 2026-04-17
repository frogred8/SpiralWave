FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace @repo/shared \
  && npm run build --workspace @repo/server \
  && npm run build --workspace @repo/client

FROM node:22-bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV CLIENT_PORT=3000
ENV SERVER_PORT=3001
ENV INTERNAL_SERVER_URL=http://127.0.0.1:3001
ENV POSTGRES_HOST=127.0.0.1
ENV POSTGRES_PORT=5432
ENV VITE_SERVER_URL=http://127.0.0.1:3001

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/client/vite.config.ts apps/client/vite.config.ts
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev --workspace @repo/server --workspace @repo/shared --workspace @repo/client --include-workspace-root=false \
  && npm cache clean --force

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/client/dist ./apps/client/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/docker/start-single-container.sh ./docker/start-single-container.sh

RUN chmod +x /app/docker/start-single-container.sh

EXPOSE 3000 3001 5432

CMD ["/app/docker/start-single-container.sh"]
