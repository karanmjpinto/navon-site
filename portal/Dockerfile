FROM node:22-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy DATABASE_URL so db/index.ts doesn't throw during next build's
# static analysis pass — overridden at runtime via docker-compose env.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/db/migrations ./db/migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3002
CMD ["pnpm", "start"]
