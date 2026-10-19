# Programa de afiliados

Candidatura de afiliado, parcerias por curso, links com código, atribuição por último clique, comissão
(liberada após 30 dias), painel do afiliado, financeiro e saques do afiliado, e a administração de tudo
isso. Código em `apps/api/src/modules/affiliate` e `apps/api/src/modules/admin-affiliates`.

## Rotas

| Rota                                                 | Quem                | O que faz                                |
| ---------------------------------------------------- | ------------------- | ---------------------------------------- |
| `GET  /api/affiliate/application`                    | qualquer logado     | dados da página de candidatura           |
| `POST /api/affiliate/application`                    | qualquer logado     | envia a candidatura                      |
| `GET  /api/affiliate/dashboard`                      | `affiliate`         | painel do afiliado                       |
| `POST /api/affiliate/links`                          | `affiliate`         | cria um link                             |
| `PUT  /api/affiliate/links/:id`                      | `affiliate` (dono)  | edita um link                            |
| `PATCH /api/affiliate/links/:id/status`              | `affiliate` (dono)  | liga ou desliga um link                  |
| `GET  /api/affiliate/financials?range=&type=`        | `affiliate`         | saldo e extrato                          |
| `POST /api/affiliate/withdrawals`                    | `affiliate`         | pede saque (escopo `affiliate`)          |
| `POST /api/affiliate/clicks`                         | **pública** (proxy) | registra o clique de um link de afiliado |
| `GET  /api/admin/affiliates/dashboard`               | `admin`             | painel do admin                          |
| `POST /api/admin/affiliates/applications/:id/review` | `admin`             | aprova ou recusa candidatura             |
| `PUT  /api/admin/affiliates/partnerships`            | `admin`             | cria ou edita parceria por curso         |
| `POST /api/admin/affiliates/partnerships/:id/review` | `admin`             | aprova ou recusa parceria                |

As respostas usam view models em camelCase no painel e `snake_case` nas linhas cruas. Dinheiro sai em
reais (número), mas todas as contas são feitas em **centavos inteiros** nos services
(`affiliate-money.ts`).

## Front (`apps/web/src`)

Services e actions são chamadores finos de `apiServer`. O `proxy.ts` chama `POST /api/affiliate/clicks` (sem
a chave interna, repassando o IP do visitante em `x-forwarded-for`, com timeout de 2 s) e não bloqueia a
navegação se a API falhar. O formulário de saque é compartilhado com o produtor
(`features/producer/financials/actions/request-withdrawal.ts`): se `account_scope === 'affiliate'`, delega
para `features/affiliate/actions/request-affiliate-withdrawal.ts`.

## Como a comissão nasce

1. **Clique.** O visitante chega com `?aff=<código>`; o `proxy.ts` grava os cookies de rastreio
   `vox_affiliate_session` (de sessão) e `vox_affiliate_visitor` (90 dias), `httpOnly` e `sameSite=lax`, e
   avisa a API. Os cookies valem só como chaves de busca (UUID): quem decide o afiliado, a taxa e a janela é
   sempre o banco.
2. **Pedido.** O servidor do Next lê os cookies e manda as duas chaves no corpo de `POST /checkout/orders`.
   Para cada curso do carrinho, `checkout/affiliate-attribution.service.ts` resolve no banco a atribuição
   válida mais recente (link ativo, parceria aprovada, janela não vencida, comprador diferente do afiliado e
   do produtor). A taxa e o valor da comissão são congelados no item do pedido.
3. **Pagamento aprovado.** Na mesma transação de `applyPayment`, `order-fulfillment.ts` grava a transação
   `affiliate_commission` pendente, de forma idempotente por item do pedido. A base da comissão é a fatia do
   **produtor**, antes de descontar o afiliado (ver [checkout.md](checkout.md)).
4. **Liberação.** A comissão fica `pending` e é liberada 30 dias depois (`AFFILIATE_COMMISSION_RELEASE_WINDOW_DAYS`).
   A liberação é "oportunista": roda ao abrir o painel, o extrato, o saque e o painel do admin
   (`releaseEligibleCommissions`).
5. **Estorno.** O estorno do pedido leva a comissão junto (ver [checkout.md](checkout.md)).

`AffiliateModule` exporta `AffiliateAttributionService`, `AffiliateCommissionService` e
`AffiliateFinanceService`. Funções puras de dinheiro em `affiliate-money.ts`:
`computeAffiliateCommissionCents(producerGrossCents, ratePercent)`, `reaisToCents` e `centsToReais`.
Quem mexe em saques usa a mesma trava (`pg_advisory_xact_lock(hashtextextended(withdrawalLockKey(scope,
userId), 0))`) antes de conferir o saldo.

## Regras de negócio

- Saldo disponível do afiliado = comissão liberada − saques reservados, calculado no servidor.
- O extrato do afiliado traz as 500 linhas mais recentes por lista (o saldo é calculado sobre tudo).
- "Vendas rastreadas" e "Comissão total" do admin somam **todas** as comissões; a tabela de auditoria
  mostra 200 linhas.
- Recarregar a página com `?aff=` dentro de 30 s (mesma sessão e mesmo link) não gera clique novo.
- Parceria nova só para quem tem o papel `affiliate`; editar uma parceria não troca o afiliado nem o curso.
- Revisão de candidatura e concessão ou revogação do papel acontecem numa **única transação**.
- O nome da campanha é único por parceria (dois afiliados podem usar "Instagram Abril"; o mesmo afiliado não
  repete no mesmo curso).
- `destinationPath` do link só aceita caminho interno (sem `//`, `?`, `#` nem espaço). O código do link é
  gerado com `crypto` e repetido em caso de violação de unicidade.
- `@Roles(['admin'])` é o único papel administrativo (não existe `super_admin` em `@vox/contracts`).

## Proteções

- **Dois saques simultâneos não estouram o saldo.** O saque roda em transação com `pg_advisory_xact_lock`
  por (afiliado, escopo), e o saldo é calculado no servidor.
- **Ninguém ganha comissão da própria compra.** A atribuição devolve `null` se o comprador é o afiliado, e o
  registro da comissão recusa autoindicação.
- **Comissão não duplica.** A gravação trava por item do pedido dentro de uma transação.
- **O clique não revela se o código existe.** `POST /affiliate/clicks` responde 204 sempre, e o proxy grava
  os cookies sempre que há `?aff=`, então não dá para enumerar códigos. A entrada é validada (chaves de
  rastreio em UUID, código só `[A-Za-z0-9_-]` com até 120 caracteres), há limite de 30 por minuto por IP,
  teto de 120 cliques por minuto por link e dedupe de recarga. O proxy repassa só o último IP do
  `x-forwarded-for`.
- **Admin com papel conferido e trilha.** Toda rota admin tem `@Roles(['admin'])`, e a revisão de
  candidatura e de parceria é auditada (`AuditService`).
- **O candidato não vê campos internos.** A resposta traz só os campos usados na tela, sem `notes`
  (anotação interna do admin), `metadata` nem `reviewed_by`.
- **`websiteUrl` seguro.** A candidatura aceita só `http` e `https` (o admin abre esse endereço na
  revisão).
- **Links só do dono.** O service filtra pelo dono da parceria (`affiliate_id = user.id`) e a parceria
  precisa estar aprovada, inclusive ao trocar a parceria de um link.
- **Parceria não é movida.** O admin não troca afiliado nem curso numa parceria existente, para que links e
  cliques não passem a pagar outra pessoa.
- **Painel do admin sem varredura.** E-mails vêm de `users` por id, e totais e somas são agregados no
  banco.

## Limitações conhecidas

- **Estorno depois da liberação:** se a comissão já foi liberada e sacada e o pedido é reembolsado, o saldo
  é limitado a zero (não fica negativo), mas o valor já pago não é cobrado de volta.
- **Limite de cliques por IP** depende de o IP real chegar à API (`x-forwarded-for` repassado pelo proxy do
  Next atrás do Caddy). Sem isso (por exemplo, em desenvolvimento), todos dividem o mesmo balde de 30 por
  minuto.
- **Liberação das comissões** é oportunista. Um job diário poderia chamar `releaseEligibleCommissions()`.
- Os cookies de rastreio não têm `Secure`; ligar quando o site for sempre https.
- **Retenção:** `affiliate_attributions` cresce a cada clique; vale uma limpeza periódica das atribuições
  expiradas há mais de 90 dias.
- O afiliado não cancela um saque pendente; uma tela de cancelamento precisaria de rota própria.
- A comissão é congelada na criação do pedido: se a parceria for revogada entre criar e pagar, a comissão
  ainda sai.
