# Imagem da API NestJS. Contexto de build = raiz do repositório:
#   docker build -f apps/api/Dockerfile -t vox-api .
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable

# Dependências primeiro (camada em cache enquanto package.json e lockfile não mudam).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @vox/api...

COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @vox/contracts build && pnpm --filter @vox/api build \
 && pnpm --filter @vox/api deploy --legacy --prod /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
# Pasta dos arquivos enviados (monte um volume aqui; ver infra/producao/compose.yaml).
# Só o necessário para rodar: fora código-fonte, testes e configs de desenvolvimento.
RUN rm -rf src test *.config.ts tsconfig*.json nest-cli.json Dockerfile CLAUDE.md \
 && mkdir -p /data/files && chown node:node /data/files
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT:-3333}/api/health" >/dev/null || exit 1
# Aplica as migrations e sobe a API (se a migration falhar, o container não sobe).
CMD ["sh", "-c", "node dist/database/migrate.js && node dist/main.js"]
