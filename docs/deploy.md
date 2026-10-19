# Colocando no ar (um servidor, Docker/Podman Compose)

Tudo roda em quatro containers: **Caddy** (HTTPS e única porta aberta), **front** (Next.js), **API**
(NestJS) e **Postgres**. Receita em `infra/producao/`.

## O que você precisa antes

| Item                       | Para quê                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Servidor Linux (2 GB+ RAM) | roda os containers; portas 80 e 443 liberadas                                                                            |
| Domínio com DNS apontando  | o Caddy emite o HTTPS sozinho (Let's Encrypt); o cookie de sessão exige HTTPS                                            |
| Conta no Mercado Pago      | Access Token e assinatura do webhook, colados no **painel do admin** depois de subir                                     |
| Servidor SMTP              | e-mail de confirmação de conta e de recuperação de senha (Resend, SES, Brevo, Gmail…), cadastrado no **painel do admin** |

Mercado Pago e e-mail não vão no `.env`: são cadastrados no painel depois de subir. Até o e-mail ser
cadastrado, nenhum e-mail sai (ninguém confirma cadastro nem troca senha), então faça isso antes de
abrir o site.

## Passo a passo

```bash
git clone https://github.com/garotodoprograma404/escola-do-garoto.git && cd escola-do-garoto
cp infra/producao/.env.example infra/producao/.env
nano infra/producao/.env          # preencha tudo; segredos com: openssl rand -hex 32
docker compose -f infra/producao/compose.yaml --env-file infra/producao/.env up -d --build
```

(Com Podman: `podman compose` no lugar de `docker compose`.)

Na subida a API aplica as migrations sozinha; se alguma falhar, o container não sobe (veja
`docker compose ... logs api`). O primeiro build leva alguns minutos.

1. **Primeiro admin:** rode o comando abaixo e responda e-mail, nome e senha (a senha não aparece). Ele
   cria a conta já confirmada e com o papel de admin, sem depender de e-mail. Se alguém já tiver se
   cadastrado pelo site com esse e-mail, a senha passa a ser a que você digitou e o acesso dessa pessoa
   cai. Serve também para recuperar o acesso de admin.
   ```bash
   docker compose -f infra/producao/compose.yaml --env-file infra/producao/.env exec api \
     node dist/database/create-admin.js
   ```
   Depois, tudo pelo painel admin (configurações, logo, categorias, cupons…). Até o e-mail ser
   cadastrado (passo 2), o cadastro pelo site fica fechado com aviso.
2. **E-mail:** em **Configurações → E-mail**, escolha o atalho do seu provedor (Resend, Brevo, Gmail,
   Amazon SES) ou preencha servidor e porta, cole o usuário e a senha (ou chave de API) e o remetente. O
   sistema conecta no servidor ao salvar; depois use **Enviar e-mail de teste** (chega no seu e-mail).
3. **Mercado Pago:** no painel do admin, em **Configurações → Financeiro**, siga o passo a passo da tela:
   cole o **Access Token** (`APP_USR-`), cadastre no Mercado Pago a URL do webhook que a tela mostra (evento
   "Pagamentos") e cole a **assinatura secreta**. O sistema confere o token na hora. Até isso ser feito, a
   compra de cursos pagos fica desligada (os grátis funcionam). Pagamentos de teste **não** disparam
   webhook: use o simulador do painel do Mercado Pago.
4. **Teste de fumaça:** abra o site, cadastre-se (o e-mail de confirmação precisa chegar), faça login, compre um
   curso de valor baixo e veja a matrícula aparecer.

## Atualizar para uma versão nova

```bash
git pull
docker compose -f infra/producao/compose.yaml --env-file infra/producao/.env up -d --build
```

## Backup (faça antes de abrir ao público)

`infra/producao/backup.sh` gera o dump do banco e o pacote dos arquivos enviados (inclui os certificados).
Agende no cron e **copie para fora do servidor**. Para restaurar:

```bash
docker compose -f infra/producao/compose.yaml --env-file infra/producao/.env exec -T postgres \
  pg_restore -U escola -d escola --clean --if-exists < backups/banco-AAAAMMDD-HHMMSS.dump
```

## Testado

A pilha completa (Postgres, API, front e Caddy) foi construída e subida em container: migrations
automáticas, cadastro com e-mail entregue por SMTP, confirmação pelo link, sessão por cookie
`HttpOnly; Secure`, upload e download de arquivo, stream em tempo real pelo Caddy e IP real do cliente na API
(o `X-Forwarded-For` forjado por quem acessa é ignorado). **Ainda não conferido:** pagamento real no Mercado
Pago.

> **Podman rootless:** o encaminhamento de porta dele esconde o IP de quem acessa (a API enxerga o IP do
> Caddy, e todos dividiriam o mesmo limite de tentativas). Em produção use **Docker** (ou Podman com root).

## Demonstração atrás do Coolify (`infra/demo/`)

Para mostrar o sistema antes do financeiro: num servidor que **já tem o Coolify** (o Traefik dele ocupa
as portas 80 e 443), sem Mercado Pago e sem SMTP.

- `DEMO_MODE=true`: pagamento pelo simulador (nada é cobrado), e-mail só no log e conta nova já
  confirmada. As outras travas de produção continuam (HTTPS, limite de tentativas, segredos).
- O site fica aberto ao público e mostra a faixa "Ambiente de demonstração".
- Nenhum serviço entra na rede `coolify` (lá `postgres` resolveria para o banco do Coolify): o proxy é que
  se conecta à rede `escola-demo`.

- A tela de login mostra os botões **Entrar como aluno / produtor / administrador** (`POST
/api/auth/demo-login`, que só existe com `DEMO_MODE`).
- O conteúdo vem de `seed-demo` (`apps/api/src/database/seed-demo.ts`): cursos do Garoto do Programa com
  vídeo, texto, quiz e PDF, modelo de certificado, cupom `GAROTO50`, posts no blog e 40 alunos com
  matrículas, progresso, avaliações e certificados espalhados pelos últimos 60 dias. Ele **zera o banco e
  os arquivos** antes, e por isso também serve de reset noturno.
- Vídeos e imagens ficam numa pasta do servidor (`DEMO_MIDIA_DIR`, padrão `/opt/escola-do-garoto-midia`, com
  `videos/*.mp4` e `imagens/`), servida em `/midia` por um nginx do próprio compose.

```bash
cp infra/demo/.env.example infra/demo/.env && nano infra/demo/.env   # segredos e SEED_*_PASSWORD
docker network create escola-demo && docker network connect escola-demo coolify-proxy   # uma vez
docker compose -f infra/demo/compose.yaml --env-file infra/demo/.env up -d --build
infra/demo/reset-demo.sh          # popula (e recria do zero quando quiser)
# Reset toda madrugada:
echo '0 4 * * * root /opt/escola-do-garoto/infra/demo/reset-demo.sh >> /var/log/escola-demo-reset.log 2>&1' \
  > /etc/cron.d/escola-demo-reset
```

Na demonstração, os e-mails (inclusive links de nova senha) vão para o log da API: só quem administra o
servidor deve ler esses logs.

Se o Coolify recriar o proxy, ligue de novo: `docker network connect escola-demo coolify-proxy`.

## Banco: extensão e ajustes

- A busca usa a extensão `pg_trgm`; a migration `0004_pg_trgm` a cria sozinha (ela é "confiável" no
  Postgres 13+, não precisa de superusuário). No Postgres gerenciado, confira se ela é permitida.
- O compose já sobe o Postgres com `random_page_cost=1.1` e `jit=off`. Em Postgres gerenciado aplique os
  mesmos parâmetros.

## Limites conhecidos (por enquanto)

- **Uma instância só:** o tempo real (chat/notificações) e a presença ficam na memória do processo da API.
  Para mais de uma instância seria preciso um barramento externo (Redis).
- **Limite de requisições das páginas:** o Next não limita; o Caddy padrão também não. Para limitar por IP
  na borda use o módulo `caddy-ratelimit` (veja o comentário em `infra/Caddyfile.example`).
- **Arquivos em disco local** (volume `files`). Trocar por S3 é implementar a interface
  `FileStorage` em `apps/api/src/modules/files/storage.ts`.
