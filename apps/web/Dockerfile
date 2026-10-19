# Imagem do front Next.js (modo standalone). Contexto de build = raiz do repositório:
#   docker build -f apps/web/Dockerfile -t vox-web .
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @vox/web...

COPY packages/contracts packages/contracts
COPY apps/web apps/web
# Endereço público do site: o Next grava NEXT_PUBLIC_* no código do navegador durante o build.
ARG NEXT_PUBLIC_APP_URL
ARG API_URL=http://api:3333
# Ambiente de demonstração (infra/demo): a faixa de aviso também vale nas páginas geradas no build.
ARG DEMO_MODE=false
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL API_URL=$API_URL DEMO_MODE=$DEMO_MODE NEXT_TELEMETRY_DISABLED=1
# `public/` é opcional (hoje não há arquivo estático): a pasta vazia garante o COPY do estágio final.
RUN mkdir -p apps/web/public \
 && pnpm --filter @vox/contracts build && pnpm --filter @vox/web build

FROM node:24-alpine
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/login >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
