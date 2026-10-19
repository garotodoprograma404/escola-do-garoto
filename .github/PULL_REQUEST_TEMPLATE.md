## O que muda

Descreva a mudança e o motivo, em poucas linhas. Vincule a issue, se houver (`Fecha #123`).

## Como foi conferido

- [ ] `pnpm check` (tipos e lint) e `pnpm build`
- [ ] Fluxo afetado conferido no navegador (`pnpm dev`)
- [ ] Interface conferida no celular e no computador (quando houver mudança visual)

## Checklist

- [ ] Rota nova exige login (ou está marcada com `@Public()` de propósito) e tem `@Roles` quando é restrita
- [ ] Entrada validada com zod e resposta só com os campos necessários
- [ ] Mudança de banco com migration gerada (`pnpm db:generate`) e SQL revisado
- [ ] Nenhum segredo, token ou dado pessoal em código, log ou mensagem de erro
- [ ] Documentação atualizada, quando a mudança afetar o uso ou a estrutura do código
