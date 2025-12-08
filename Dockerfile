# -----------------------
# 1) Etapa de build
# -----------------------
FROM node:22-alpine AS builder

# Carpeta de trabajo dentro de la imagen
WORKDIR /app

# Copiamos solo los archivos de dependencias primero (para cache)
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos TODO el código del proyecto
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
ENV HOST=0.0.0.0  

# Copiamos SOLO lo necesario desde la etapa "builder"
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponemos el puerto interno del contenedor
EXPOSE 3000

# Comando que arranca la app SSR de Astro
CMD ["node", "dist/server/entry.mjs"]
