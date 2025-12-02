# -----------------------
# 1) Etapa de build
# -----------------------
FROM node:22-alpine AS builder

# Carpeta de trabajo dentro de la imagen
WORKDIR /app

# Copiamos solo los archivos de dependencias primero (para cache)
COPY package*.json ./

# Instalamos dependencias (ajusta si usas pnpm/yarn)
RUN npm install

# Copiamos TODO el código del proyecto (incluye .env)
COPY . .

# Hacemos el build de Astro (SSR)
RUN npm run build


# -----------------------
# 2) Etapa de runtime
# -----------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Variables de entorno básicas
ENV NODE_ENV=production
ENV PORT=3000

# Copiamos SOLO lo que necesitamos para correr la app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponemos el puerto interno del contenedor
EXPOSE 3000

# Comando que arranca tu app SSR de Astro
CMD ["node", "dist/server/entry.mjs"]
