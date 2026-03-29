FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

ENV VITE_SERVER_URL=

RUN npm run build --workspace @repo/shared \
  && npm run build --workspace @repo/server \
  && npm run build --workspace @repo/client

RUN chmod +x /app/docker/start-single-container.sh

EXPOSE 3000

CMD ["/app/docker/start-single-container.sh"]
