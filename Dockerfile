# -----------------------
# 1) Etapa de build
# -----------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# -----------------------
# 2) Etapa de runtime
# -----------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Importante: dejamos que Astro tome PORT y HOST de env
CMD ["node", "dist/server/entry.mjs"]
