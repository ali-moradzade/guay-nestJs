FROM node:22-bookworm-slim

WORKDIR /usr/src/app

COPY . .

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

CMD ["pnpm", "test"]
