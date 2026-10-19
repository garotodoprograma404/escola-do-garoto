# Arquitetura

## Visão geral

```
 navegador ──► Caddy (HTTPS, IP real) ──► Next.js (telas, SSR)  ──┐  chamadas do servidor
                          └────────────► NestJS (API, /api/*) ◄───┘  (cookie + x-internal-key)
                                              │
                                              ├──► PostgreSQL (Drizzle ORM)
                                              └──► arquivos (volume em disco, atrás de uma interface)
```

Em desenvolvimento não há Caddy: o Next repassa `/api/*` para a API (`rewrites` no `next.config.ts`).

## Monorepo (pnpm workspaces)

| Pacote               | O que é                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| `apps/web`           | Front Next.js 16 (App Router), Tailwind e shadcn/Radix. Só telas; fala com a API |
| `apps/api`           | API NestJS (ESM, Express): regra de negócio, autorização, acesso ao banco        |
| `packages/contracts` | Tipos e schemas compartilhados (o front importa só tipos)                        |
| `infra/`             | Postgres local e a receita de produção (compose + Caddy)                         |

O código vive só nesses quatro lugares. Documentação: `docs/areas/` (o que cada área faz), `docs/seguranca.md`,
`docs/decisoes.md` e `docs/deploy.md`.

## API (`apps/api/src`)

```
config/        variáveis de ambiente validadas (com travas para produção)
database/      Drizzle: schema por domínio, migrations, seed
common/        pipe do zod, checagem de origem (CSRF)
modules/<área> controller (HTTP) + service (regra) + schemas (zod)
```

Módulos: `auth`, `users`, `mail`, `files`, `notifications`, `audit` (base) e, por área, `catalog`,
`categories`, `content` (banners e vitrines), `blog`, `settings`, `checkout`, `finance`, `learning`,
`student`, `producer`, `producer-courses`, `admin-courses`, `admin-users`, `admin-dashboard`, `support`,
`chat`, `certificates`, `affiliate`, `admin-affiliates`.

Convenções:

- Guards globais, nesta ordem: limite de tentativas → sessão → papel. Toda rota exige login; `@Public()`
  libera e `@Roles([...])` restringe.
- Recurso de usuário é sempre filtrado pelo id da **sessão** dentro do service.
- Entrada validada com zod; resposta com `select` explícito.
- Escrita em várias tabelas dentro de `db.transaction`.

## Front (`apps/web/src`)

```
app/             rotas (grupos: (auth), (dashboard), (immersive), (preview) e páginas públicas)
features/<área>/ componentes, actions e services da área (admin, producer, student, public, affiliate, chat…)
shared/          componentes de UI, hooks e utilitários
lib/             server-api (servidor), api-client (navegador), session
proxy.ts         proteção de rotas por papel e captura de afiliado
```

Os services/actions do front são chamadores finos da API (`apiServer` no servidor, `apiRequest` no
navegador). Campos chegam em `snake_case`, o formato que os componentes consomem. O que cada área faz está em
[areas/README.md](areas/README.md).

## Banco

PostgreSQL 17, schema em `apps/api/src/database/schema/` (um arquivo por domínio), com nomes em `snake_case`,
ids `bigint` nas tabelas de catálogo e `uuid` nas de pessoa, e dinheiro em `numeric(10,2)`. Migrations em
`apps/api/drizzle/`: `0000_initial_schema.sql` e `0002_indexes_and_constraints.sql` geradas pelo
`drizzle-kit`; `0001_triggers.sql` (gatilhos de `updated_at`, contadores do blog e do suporte) escrita à mão.
A API aplica as migrations ao subir em produção.

## Autenticação e sessão

Cadastro com confirmação de e-mail, login, sessão por token opaco (hash no banco) em cookie `HttpOnly`,
recuperação de senha. Os e-mails saem pelo servidor SMTP cadastrado no painel (`DynamicMailService`; sem
servidor, só no log fora de produção). Papéis: `student`, `producer`, `affiliate`, `admin` (um usuário pode ter vários).
Proteções em [seguranca.md](seguranca.md).

## Tempo real

SSE (`EventSource`) para chat de suporte e notificações; envio por POST. Uma instância da API.
