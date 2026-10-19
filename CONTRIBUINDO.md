# Contribuindo

Obrigado pelo interesse em contribuir com a Escola do Garoto;. Este guia reúne o que é preciso para
preparar o ambiente, seguir o fluxo de trabalho e entregar uma mudança que passe na revisão.

## Antes de começar

- [`README.md`](README.md): visão geral do projeto.
- [`docs/arquitetura.md`](docs/arquitetura.md): como as peças conversam.
- [`docs/areas/`](docs/areas/README.md): o que cada área faz, com rotas, regras e proteções.
- [`docs/seguranca.md`](docs/seguranca.md): as proteções e o checklist de cada rota da API.

## Ambiente

| Peça             | Versão    | Onde                                    |
| ---------------- | --------- | --------------------------------------- |
| Node             | 24        | raiz (`.nvmrc`)                         |
| pnpm             | 11        | raiz (workspaces)                       |
| Next.js / React  | 16 / 19   | `apps/web`                              |
| NestJS / Drizzle | 12 / 0.45 | `apps/api`                              |
| PostgreSQL       | 17        | `infra/compose.yaml` (Docker ou Podman) |

```bash
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev          # API em :3333 e site em :3000

pnpm check        # tipos e lint
pnpm build        # build de produção
pnpm format       # Prettier
```

## Fluxo de trabalho

1. Abra uma issue descrevendo o problema ou a proposta, ou comente numa existente.
2. Crie uma branch a partir de `main`.
3. Faça mudanças pequenas e focadas.
4. Abra o pull request preenchendo o modelo.

## Regras do código

- **O front nunca acessa o banco.** Os dados chegam ao `apps/web` só pela API.
- **Toda rota da API exige login por padrão.** Rota pública é marcada com `@Public()`; rota restrita usa
  `@Roles(...)`. Autorização sempre no servidor, nunca só escondendo botão.
- **Toda entrada é validada com zod** antes de chegar no service.
- **Toda resposta devolve só os campos necessários.** Nunca a linha inteira do banco.
- **Mudança de banco** é no schema do Drizzle (`apps/api/src/database/schema/`) mais a migration gerada por
  `pnpm db:generate`. Leia o SQL gerado antes de aplicar.
- **Dinheiro** em `numeric(10,2)` no banco e em centavos inteiros dentro dos services.
- **Sem segredo no código.** Variáveis em `.env` (fora do git), documentadas no `.env.example`.
- Nomes de código em inglês; textos para o usuário, comentários e documentação em português do Brasil.
- Prettier sem ponto e vírgula, aspas simples e 100 colunas (a ironia não passou despercebida).

## Commits

Mensagens curtas em português, no formato `tipo(escopo): descrição`, por exemplo
`feat(api/catalogo): filtro por nível` ou `fix(web/player): retoma o vídeo de onde parou`.

## Telas

- Siga os componentes de `apps/web/src/shared/components/ui`; não redesenhe sem combinar.
- Texto sempre acentuado. Nada de rolagem horizontal em 375 px.
- Acessibilidade (WCAG 2.1 AA): botão só com ícone leva nome, `<Progress>` e seletores com rótulo, e janelas
  pelos componentes `Dialog`/`AlertDialog`/`Sheet` (o foco volta para quem abriu).
