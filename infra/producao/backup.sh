#!/usr/bin/env bash
# Backup do banco (pg_dump) e dos arquivos enviados. Rode da raiz do repositório:
#   infra/producao/backup.sh [pasta-destino]
# Para usar Podman: COMPOSE="podman compose" infra/producao/backup.sh
# Agende no cron do servidor (ex.: todo dia às 3h) e copie os arquivos para FORA do servidor.
set -euo pipefail

DESTINO="${1:-./backups}"
COMPOSE="${COMPOSE:-docker compose} -f infra/producao/compose.yaml --env-file infra/producao/.env"
CARIMBO="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DESTINO"

# shellcheck disable=SC2086
$COMPOSE exec -T postgres pg_dump -U escola -Fc escola > "$DESTINO/banco-$CARIMBO.dump"
# shellcheck disable=SC2086
$COMPOSE exec -T api tar -C /data -cf - files | gzip > "$DESTINO/arquivos-$CARIMBO.tar.gz"

# Guarda só os 14 últimos de cada tipo.
ls -1t "$DESTINO"/banco-*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
ls -1t "$DESTINO"/arquivos-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Backup salvo em $DESTINO ($CARIMBO)"
