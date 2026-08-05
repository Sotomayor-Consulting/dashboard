# ============================================
# Base: node + pnpm via corepack
# ============================================
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable
WORKDIR /app

# ============================================
# 1) Etapa de dependencias (capa cacheable)
# ============================================
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    pnpm install --frozen-lockfile

# ============================================
# 2) Etapa de build
# ============================================
FROM base AS builder

# Variables PUBLIC_* necesarias durante el build de Astro/Vite
# Vite las lee de process.env para reemplazar import.meta.env.PUBLIC_*
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG PUBLIC_TURNSTILE_SITE_KEY
ARG PUBLIC_GOOGLE_CLIENT_ID
ENV PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
ENV PUBLIC_SUPABASE_PUBLISHABLE_KEY=${PUBLIC_SUPABASE_PUBLISHABLE_KEY}
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=${PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY}
ENV PUBLIC_GOOGLE_CLIENT_ID=${PUBLIC_GOOGLE_CLIENT_ID}

# Sentry sube los source maps durante `astro build`, así que el token va como
# build arg y no como variable de runtime. Sin él el build igual funciona, pero
# los stack traces de producción llegan minificados.
# Generarlo con scope mínimo (project:releases): los build args quedan en el
# historial de capas de la imagen.
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Cache-buster: fuerza rebuild por deploy
ARG GIT_SHA=dev
RUN echo "Building commit: ${GIT_SHA}"

# astro check se ejecuta localmente o en CI, no en Docker build
RUN pnpm astro build --force

# ============================================
# 3) Etapa de producción (deps prod only)
# ============================================
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=.npmrc,target=.npmrc \
    pnpm install --prod --frozen-lockfile

# ============================================
# 4) Etapa de runtime
# ============================================
ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Dependencias de sistema para módulos nativos (carbone, etc.)
# Consolidar RUN para minimizar capas
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001 -G nodejs

# Dependencias de producción (read-only para el proceso)
COPY --from=prod-deps --chown=astro:nodejs /app/node_modules ./node_modules
COPY --chown=astro:nodejs package.json ./

# Artefactos SSR
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/server-wrapper.mjs ./server-wrapper.mjs

# Bootstrap de Vault en runtime (Node 22 ejecuta el source TS directamente)
COPY --from=builder --chown=astro:nodejs /app/src/lib/infrastructure/vault ./src/lib/infrastructure/vault
COPY --from=builder --chown=astro:nodejs /app/src/lib/infrastructure/logging ./src/lib/infrastructure/logging

# Templates usados en runtime (carbone)
COPY --from=builder --chown=astro:nodejs /app/src/domains/documents/templates ./src/domains/documents/templates
COPY --from=builder --chown=astro:nodejs /app/src/lib/infrastructure/email ./src/lib/infrastructure/email

USER astro

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

# dumb-init maneja señales correctamente (SIGTERM, etc.)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--experimental-strip-types", "server-wrapper.mjs"]
