# ============================================
# 1) Etapa de dependencias (capa cacheable)
# ============================================
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# 2) Etapa de build
# ============================================
FROM node:22-alpine AS builder
WORKDIR /app

# Variables PUBLIC_* necesarias durante el build de Astro/Vite
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ARG PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG PUBLIC_TURNSTILE_SITE_KEY
ARG PUBLIC_GOOGLE_CLIENT_ID
ENV PUBLIC_SUPABASE_URL=${PUBLIC_SUPABASE_URL}
ENV PUBLIC_SUPABASE_ANON_KEY=${PUBLIC_SUPABASE_ANON_KEY}
ENV PUBLIC_STRIPE_PUBLISHABLE_KEY=${PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV PUBLIC_TURNSTILE_SITE_KEY=${PUBLIC_TURNSTILE_SITE_KEY}
ENV PUBLIC_GOOGLE_CLIENT_ID=${PUBLIC_GOOGLE_CLIENT_ID}

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY . .

# Cache-buster: fuerza rebuild por deploy
ARG GIT_SHA=dev
RUN echo "Building commit: ${GIT_SHA}"

# astro check se ejecuta localmente o en CI, no en Docker build
RUN npx astro build --force

# ============================================
# 3) Etapa de runtime (producción)
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Dependencias de sistema para módulos nativos (carbone, etc.)
RUN apk add --no-cache dumb-init

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001 -G nodejs

# Dependencias de producción (determinísticas con npm ci)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Artefactos SSR
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/server-wrapper.mjs ./server-wrapper.mjs

# Bootstrap de Vault en runtime (Node 22 ejecuta el source TS directamente)
COPY --from=builder --chown=astro:nodejs /app/src/lib/infrastructure/vault ./src/lib/infrastructure/vault
COPY --from=builder --chown=astro:nodejs /app/src/lib/infrastructure/logging ./src/lib/infrastructure/logging

# Templates usados en runtime (carbone, emails)
COPY --from=builder --chown=astro:nodejs /app/src/domains/documents/templates ./src/domains/documents/templates

USER astro

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

# dumb-init maneja señales correctamente (SIGTERM, etc.)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--experimental-strip-types", "server-wrapper.mjs"]
