# -----------------------
# 1) Etapa de build
# -----------------------
FROM node:22-alpine AS builder

# Carpeta de trabajo dentro de la imagen
WORKDIR /app

# Copiamos solo los archivos de dependencias primero (para cache)
COPY package*.json ./

# Instalamos dependencias (incluye dev para el build)
RUN npm install

# Copiamos TODO el código del proyecto
COPY . .

# Hacemos el build de Astro (SSR)
RUN npm run build


# -----------------------
# 2) Etapa de runtime (CORREGIDA)
# -----------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Variables de entorno importantes
ENV NODE_ENV production
ENV PORT 3000

# 1. Copiamos los archivos de configuración
COPY --from=builder /app/package*.json ./

# 2. Copiamos el código del servidor compilado
COPY --from=builder /app/dist ./dist

# 3. Instalamos SÓLO las dependencias de producción
# Esto asegura una imagen final muy pequeña y optimizada.
RUN npm install --omit=dev

# Exponemos el puerto interno del contenedor (debe coincidir con ENV PORT)
EXPOSE 3000

# Comando que arranca tu app SSR de Astro 
# (el punto de entrada del adaptador Node)
CMD ["node", "dist/server/entry.mjs"]