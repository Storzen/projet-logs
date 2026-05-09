FROM oven/bun:1.3.13 AS deps

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --ci \
    --registry=https://registry.npmjs.org \
    --global-cache-dir=/tmp/bun-global-cache

FROM oven/bun:1.3.13 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN bun run build

FROM oven/bun:1.3.13 AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd -r -g 1001 nodejs && \
    useradd --uid 1001 -r -g nodejs -m -d /app nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "x", "next", "start"]
