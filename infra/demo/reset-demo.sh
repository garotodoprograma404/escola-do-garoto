#!/bin/sh
# Recria a demonstração do zero (banco + arquivos enviados): cursos do Garoto do Programa, alunos,
# certificados, blog e cupom. Agendado no cron do servidor para toda madrugada:
#   0 4 * * * root /opt/escola-do-garoto/infra/demo/reset-demo.sh >> /var/log/escola-demo-reset.log 2>&1
set -eu
cd "$(dirname "$0")/../.."
set -a
. infra/demo/.env
set +a
echo "== $(date -Is) reset da demonstração"
docker compose -f infra/demo/compose.yaml --env-file infra/demo/.env exec -T \
  -e SEED_ADMIN_PASSWORD -e SEED_PRODUCER_PASSWORD -e SEED_STUDENT_PASSWORD -e DEMO_COMPANY_DOCUMENT \
  api node dist/database/seed-demo.js
