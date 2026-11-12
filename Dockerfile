# syntax=docker/dockerfile:1.7

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:26.13.1-alpine3.24 AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Node 26 ships no corepack: install the pnpm that package.json pins. npm 11
# skips its install script, so pnpm runs through Node (no native binary).
RUN npm install -g --no-fund --no-audit "$(node -p 'require("./package.json").packageManager')"
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --config.strict-dep-builds=false

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:26.13.1-alpine3.24 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Node 26 ships no corepack: install the pnpm that package.json pins. npm 11
# skips its install script, so pnpm runs through Node (no native binary).
RUN npm install -g --no-fund --no-audit "$(node -p 'require("./package.json").packageManager')"

# Build-time env vars (public — safe to bake in)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_APP_VERSION
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_BRAND_NAME
ARG NEXT_PUBLIC_BRAND_TAGLINE
ARG NEXT_PUBLIC_BRAND_DESCRIPTION
ARG NEXT_PUBLIC_GLITCHTIP_DSN
ARG NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_BRAND_NAME=$NEXT_PUBLIC_BRAND_NAME
ENV NEXT_PUBLIC_BRAND_TAGLINE=$NEXT_PUBLIC_BRAND_TAGLINE
ENV NEXT_PUBLIC_BRAND_DESCRIPTION=$NEXT_PUBLIC_BRAND_DESCRIPTION
ENV NEXT_PUBLIC_GLITCHTIP_DSN=$NEXT_PUBLIC_GLITCHTIP_DSN
ENV NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=$NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:26.13.1-alpine3.24 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# wget is needed for the HEALTHCHECK below (absent by default on some Alpine variants)
RUN apk add --no-cache wget \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Standalone output + static assets. `public` and `.next/static` must be
# copied separately because `output: "standalone"` omits them.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null || exit 1

CMD ["node", "server.js"]
