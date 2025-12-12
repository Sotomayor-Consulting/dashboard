# -----------------------
# 1) Etapa de build
# -----------------------
FROM node:22-alpine AS builder
WORKDIR /app

# (A) deps primero (capa cacheable)
COPY package*.json ./
# mejor que npm install para builds repetibles en CI
RUN npm ci

# (B) code después (si cambia el repo, invalida)
COPY . .

# (C) Cache-buster: cambia por deploy para forzar rebuild aunque Docker “crea” que todo es igual
ARG GIT_SHA=dev
RUN echo "Building commit: ${GIT_SHA}"

RUN npm run build

# -----------------------
# 2) Etapa de runtime
# -----------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Si su runtime realmente necesita deps en runtime:
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Artefactos SSR
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 4321
CMD ["node", "server.mjs"]
