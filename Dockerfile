# ==========================================================
# Clyvo - Backend
#
# Build em duas etapas: a primeira compila o TypeScript, a segunda
# leva so o resultado. A imagem final nao carrega o tsc nem os @types.
#
# IMPORTANTE: rode a partir da RAIZ do projeto (a pasta que tem
# "backend" e "database" dentro), nao de dentro de "backend":
#
#   docker build -t clyvo-api .
#   docker run -p 3333:3333 --env-file backend/.env clyvo-api
# ==========================================================

# ---------- Etapa 1: compilar ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copiar so os manifestos primeiro faz o Docker reaproveitar o cache
# das dependencias quando apenas o codigo muda.
COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Descarta as dependencias de desenvolvimento.
RUN npm prune --omit=dev

# ---------- Etapa 2: imagem final ----------
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node backend/package.json ./
# O script de migration le daqui.
COPY --chown=node:node database ./database

# Nao rodar como root.
USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3333)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
