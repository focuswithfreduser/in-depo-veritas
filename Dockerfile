# syntax=docker.io/docker/dockerfile:1

FROM node:20-alpine AS base

RUN apk add --no-cache \
  libc6-compat \
  openssl

RUN corepack enable pnpm
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache \
  g++ \
  make \
  py3-pip \
  pkgconfig \
  jpeg-dev \
  cairo-dev \
  giflib-dev \
  pango-dev \
  libtool \
  autoconf \
  automake

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml .npmrc* ./
COPY prisma/ ./
RUN pnpm i --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY .env.docker ./.env
COPY . .

ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV DOCKER_BUILD=1

RUN pnpm run build

FROM base AS runner
WORKDIR /app


ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs ./prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
