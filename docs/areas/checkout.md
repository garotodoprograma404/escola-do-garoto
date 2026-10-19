# Checkout, pagamentos, cupons e financeiro

Checkout com Mercado Pago, cupons, financeiro do aluno e financeiro do admin. Código em
`apps/api/src/modules/checkout` e `apps/api/src/modules/finance`.

## Rotas (prefixo `/api`)

| Rota                                                                                       | Quem            | O que faz                                                                                    |
| ------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------- |
| `GET  /api/checkout/payment-options`                                                       | público         | métodos de pagamento ligados no admin (`platform_settings`)                                  |
| `POST /api/checkout/coupons/apply`                                                         | logado          | "aplicar cupom" do carrinho: calcula o desconto sobre o preço do BANCO (nada é reservado)    |
| `POST /api/checkout/orders`                                                                | logado          | cria o pedido (ou devolve o pendente igual) e o link de pagamento; total 0 já nasce pago     |
| `GET  /api/checkout/orders/:publicId`                                                      | **dono**        | pedido no formato `snake_case` das telas (lista fixa de campos)                              |
| `POST /api/checkout/orders/:publicId/sync`                                                 | **dono**        | consulta o Mercado Pago e aplica (tela de sucesso)                                           |
| `GET  /api/checkout/orders/:publicId/guest`                                                | público (id)    | só pedido SEM dono (compra sem conta), para "finalizar conta"                                |
| `POST /api/checkout/orders/:publicId/finalize-account`                                     | público (id)    | define a senha de quem pagou sem ter conta (ver "Compra sem conta")                          |
| `POST /api/payments/mercadopago/webhook`                                                   | Mercado Pago    | notificação **assinada** (`x-signature`); reconsulta o pagamento                             |
| `POST /api/dev/payments/:publicId/simulate`                                                | dono, só `fake` | aprova/recusa/estorna pelo MESMO caminho do webhook (404 fora do modo `fake`)                |
| `GET/POST/PATCH/DELETE /api/admin/coupons…`                                                | admin           | CRUD, ligar/desligar, estatísticas, histórico de uso, cursos elegíveis, código disponível    |
| `GET  /api/finance/student/transactions\|stats`                                            | logado (dono)   | histórico e resumo de compras                                                                |
| `POST/GET /api/finance/student/transactions/:id/invoice`                                   | logado (dono)   | gera e baixa o comprovante                                                                   |
| `POST /api/finance/student/refunds`                                                        | logado (dono)   | pedido de reembolso (7 dias, um por compra)                                                  |
| `GET  /api/admin/finance/metrics\|transactions\|liquidity\|fiscal-compliance\|withdrawals` | admin           | painel do admin                                                                              |
| `POST /api/admin/finance/withdrawals/:id/approve\|processing\|reject\|pay`                 | admin           | ciclo do saque                                                                               |
| `GET  /api/admin/finance/report`                                                           | admin           | relatório CSV do período                                                                     |
| `GET  /api/admin/finance/refunds`                                                          | admin           | fila de pedidos de reembolso (`?status=open\|all\|requested\|approved\|completed\|rejected`) |
| `POST /api/admin/finance/refunds/:id/approve\|reject`                                      | admin           | aprova (pede o estorno ao gateway) ou recusa com motivo                                      |

## Código principal

- `money.ts` (centavos), `commission.ts`, `coupon-discount.ts` (rateio por centavos, maior resto),
  `order-transition.ts` (máquina de estados), `order-fulfillment.ts` (efeitos do pagamento aprovado).
- `gateway/*`: porta `PaymentGateway`, cliente Mercado Pago por `fetch`, simulador `fake`, assinatura HMAC.
- Front (`apps/web/src`): chamadores finos da API (`apiServer`) em `features/public/checkout/**`,
  `features/public/cart/services/coupon-calculator.ts`, `features/student/financials/**`,
  `features/admin/coupons/**`, `features/admin/finance/**` e na página
  `app/(dashboard)/student/financials`. A rota `/api/payments/mercadopago/webhook` não existe no Next: o
  `rewrites` manda direto para a API. A tela `/checkout/simulador?pedido=` serve ao
  simulador (desenvolvimento sem credenciais e ambiente de demonstração).

## Regras de negócio

- **Comissão da plataforma:** `profiles.commission_rate` do produtor (padrão 10%, percentual: `1` = 1%),
  congelada em cada `checkout_order_items` junto com `platform_amount` e `producer_amount`. A comissão de
  afiliado sai da parte do produtor e vira `transactions.type = 'affiliate_commission'` pendente.
- **Quem muda um pedido:** só `PaymentsService.applyPayment`. Webhook, sincronização da tela de sucesso e
  simulador passam todos por ele: reconsulta do pagamento (o corpo da notificação não manda), lock do
  pedido, conferência de moeda + valor + referência, máquina de estados pura (`order-transition.ts`),
  efeitos em `order-fulfillment.ts`.
- **Estados** (`checkout_orders.status`): `pending → in_process → approved | failed | cancelled`;
  `approved → refunded`; `free_completed` (total 0). Pagamento aprovado **depois** de o pedido expirar
  libera o acesso (a pessoa pagou); um segundo pagamento aprovado vira o evento `duplicate_payment`; o
  estorno de um pagamento duplicado vira `refund_of_other_payment` e não derruba o pedido pago por outro.
- **Eventos:** `payment_events` (`action` = resultado: `applied`, `amount_mismatch`, `unknown_order`,
  `duplicate_payment`, `refund_of_other_payment`, `awaiting_account`, `duplicate_purchase`,
  `coupon_reactivated`). Chave `payment:<id>:<status>:<última atualização>`: reentrega não duplica.
- **Expiração:** pedido pendente expira em 48 h (job de 10 em 10 min, mais limpeza na hora ao criar pedido
  ou aplicar cupom). Pedido igual é reaproveitado; um pedido novo substitui o pendente que divide curso ou
  cupom.
- **Cupom:** reserva ao criar o pedido (`metadata.coupon_reservation = 'reserved'`), consumo ao pagar (grava
  `coupon_usage`, o contador não muda), devolução se o pedido expirar, for substituído ou cancelado (e o
  link de pagamento é encerrado no Mercado Pago junto). Pedido `failed` (recusa) e `in_process` continuam
  segurando a reserva: um pedido novo substitui o `failed` e recusa o `in_process` ("pagamento em
  análise"). Se um link devolvido for pago mesmo assim (o gateway não conseguiu encerrá-lo), o pedido é
  liberado e o evento `coupon_overuse` avisa o financeiro. Uso por pessoa: 1 por cupom, conferido em
  `coupon_usage` + reserva própria. O percentual arredonda para baixo (nunca dá meio centavo a mais que o
  prometido). Cupom já usado não é excluído, só desativado.
- **Ordem de travas (evita deadlock):** sempre **cupom antes do pedido**, e vários cupons em ordem de id
  (criar pedido trava de uma vez o cupom pedido e os dos pedidos abertos da pessoa; webhook; expiração;
  finalizar conta). A faxina de vencidos dentro de uma requisição só mexe nos pedidos DA PESSOA e do cupom
  pedido; a varredura global é só do job. Respeite isso ao mexer.
- **Dinheiro:** centavos inteiros em todo o service (`money.ts`, `commission.ts`); o `numeric(10,2)` do
  banco é convertido na borda (`dbToCents`/`centsToReais`). As respostas para as telas saem em **reais**
  (`number`).
- **Gateway:** `PaymentGateway` é a porta; quem escolhe a implementação, a cada uso, é o
  `DynamicPaymentGateway`: com `DEMO_MODE`, sempre o simulador (`FakeGateway`); com credenciais do Mercado
  Pago cadastradas no painel, `MercadoPagoGateway`; sem credenciais, simulador fora de produção e
  **desligado** em produção (o pedido pago é recusado com "pagamentos ainda não configurados" e o cupom
  volta). Métodos de pagamento e parcelas vêm de `platform_settings` (`payment_*`), as mesmas chaves do admin.
- **Credenciais do Mercado Pago no painel** (Configurações → Financeiro, rotas `GET/PUT/DELETE
/api/admin/payment-gateway` e `POST /api/admin/payment-gateway/check`, só admin): Access Token e
  assinatura secreta do webhook. Ao salvar, o token é conferido no Mercado Pago (`/users/me`) e
  recusado se inválido. Ficam cifrados (AES-256-GCM, chave derivada do `FILES_SIGNING_SECRET`) na tabela
  `payment_gateway_credentials` e nunca voltam para a tela: o painel vê a dica do token, a conta, se é de
  teste ou de produção e a URL do webhook (montada a partir do `WEB_ORIGIN`). Trocar o
  `FILES_SIGNING_SECRET` obriga a cadastrar de novo.
- **Afiliado:** o servidor do Next repassa as chaves de rastreio (cookies `vox_affiliate_*`); a API resolve
  no banco o clique mais recente válido (`affiliate-attribution.service.ts`). O registro do clique (proxy)
  é da área de afiliados ([afiliados.md](afiliados.md)). Autoindicação (afiliado = comprador ou = produtor),
  clique vencido, link desligado e parceria não aprovada não geram comissão.
- **Matrícula:** criada pelo checkout (e pelo `enroll-student` do admin). `courses.total_students` anda
  junto: +1 ao matricular, -1 ao estornar. Comprar um curso estornado reativa a MESMA matrícula. O produtor
  não compra o próprio curso.
- **Comprovante:** HTML (`comprovante-<número>.html`), gerado sob demanda e baixado só pelo dono.
- **Reembolso** (`finance/refund-request.ts`, `finance/admin-refunds.service.ts`):
  - o aluno pede em `/student/financials` até **7 dias** depois da compra (direito de arrependimento, a mesma
    regra da política de reembolso), uma vez por compra; compra grátis não tem reembolso. Vira uma
    transação `refund` pendente (valor do pedido inteiro e motivo) e a compra mostra o andamento;
  - o admin decide na aba **Reembolsos** de `/admin/finance`. **Recusar** exige motivo (o aluno vê no sino e
    na compra). **Aprovar** marca `approved_at` e chama `PaymentsService.refundOrder`: no Mercado Pago, pede
    o estorno total (`POST /v1/payments/{id}/refunds` com `X-Idempotency-Key: refund-request-<id>`) e
    reconsulta o pagamento; compra do simulador (`fake-…`) é estornada na hora;
  - quem muda o pedido é o pagamento estornado, pelo `applyPayment` de sempre: pedido `refunded`, matrícula
    `refunded`, certificado revogado ("Compra estornada"), transações do pedido `refunded` (o produtor e o
    afiliado perdem a parte deles), pedido de reembolso `completed` e aviso "Compra estornada" no sino;
  - se o Mercado Pago ainda não confirmou, o pedido fica "aprovado, aguardando estorno" e o webhook conclui.
    O admin pode tentar de novo (mesma chave, com o id do pagamento: não estorna duas vezes). Se o
    estorno não vai acontecer, o admin encerra o aprovado sem estorno, com motivo (só se a compra não foi
    estornada);
  - estorno feito direto no painel do Mercado Pago também conclui o pedido de reembolso aberto. O valor
    devolvido conta uma vez só no resumo do aluno (pela compra `refunded`);
  - compra sem pagamento estornável (`FREE_`, `ORDER_`, ou do simulador fora do modo simulador): a API recusa
    aprovar e o admin devolve por fora;
  - a compra que um produtor faz como aluno (e o reembolso dela) nunca entra no saldo de produtor dele.
    A taxa de reembolso do painel do admin é reembolsados / pagos.
- **Saque do admin:** aprovar, processar, rejeitar e marcar como pago (aprovado → concluído).

### Compra sem conta ("finalizar conta")

O checkout exige login (`/checkout` manda para `/register`), então nenhum pedido novo nasce sem dono. O
fluxo existe para o caso de um pedido pago sem dono: ele fica `approved` (evento `awaiting_account`, sem
matrícula); `finalize-account` cria a conta pelo cadastro normal (`AuthService.register`, e-mail por
confirmar), liga o pedido e libera a matrícula. Se o e-mail do pedido já tem conta, o pedido é ligado a ela
e a senha **não** muda. Depois de definir a senha, a pessoa confirma o e-mail e só então entra. Para
ativar de vez a compra sem cadastro seria preciso um `POST /checkout/orders` de convidado (decisão de
produto).

## Proteções

| Ameaça                                                                       | Defesa                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook forjado ou com valor diferente do pedido                             | `applyPayment` exige moeda `BRL` e valor em centavos IGUAL ao do pedido; senão grava o evento `amount_mismatch` e **não libera**                                                                                                                                                                                      |
| Webhook sem assinatura                                                       | HMAC `x-signature` obrigatório (comparação em tempo constante, tamanho conferido antes); o `data.id` processado é o da query assinada; token na URL não vale                                                                                                                                                          |
| Cupom que nunca esgota ou é usado além do limite                             | `coupons.usage_count` é reserva + consumo, incrementado por `UPDATE … WHERE usage_count < usage_limit` (atômico); devolvido se o pedido expira, é substituído ou cancelado; **recusa NÃO devolve** (o link ainda aceita outro meio) e, sempre que o cupom volta, o link é encerrado no Mercado Pago (`closeCheckout`) |
| Corrida entre webhooks duplicando transação e comissão                       | pedido travado `FOR UPDATE` + máquina de estados + `ON CONFLICT DO NOTHING`; pedido, matrícula, transações e cupom na mesma transação; reentrega não duplica                                                                                                                                                          |
| Estorno sem perda de acesso                                                  | `refunded`/`charged_back` → pedido `refunded`, matrícula `refunded` (só a que ESSA compra concedeu; curso coberto por outro pedido pago continua), transações do pedido `refunded` (saem do saldo do produtor) e pedido de reembolso aberto concluído; certificado revogado e aluno avisado                           |
| Pedido pendente eterno ou duplicado                                          | expira em 48 h; pedido igual é reaproveitado; pedido novo substitui o pendente que divide curso ou cupom                                                                                                                                                                                                              |
| Pedido visível ou reconciliável por qualquer um com o id; vazamento no log   | só o dono; resposta com lista fixa de campos (sem `user_id`, `payment_id`, telefone, CPF, metadata interno); `payment_events` guarda só campos permitidos; erro do gateway nunca inclui token, corpo da resposta nem dado do pagador                                                                                  |
| Erro de arredondamento, taxa mal interpretada, curso coberto por cupom com 0 | tudo em centavos inteiros; taxa é percentual (`1` = 1%); a preferência de pagamento tem UMA linha pelo total; total 0 não passa pelo Mercado Pago e nasce `free_completed`                                                                                                                                            |
| Cliente manda preço ou lista de cursos                                       | o cliente manda só ids, cupom, método e chaves de rastreio; curso inexistente ou indisponível é erro; o servidor decide todos os valores                                                                                                                                                                              |
| Teste de cupom em massa e descoberta de quais existem                        | "aplicar cupom" exige login e tem limite por sessão e por IP; cupom inexistente, desligado, futuro e vencido respondem a **mesma** mensagem                                                                                                                                                                           |
| Ação de saque sem papel                                                      | `@Roles(['admin'])`; transição atômica por estado (409 se mudou); auditoria; aviso à pessoa                                                                                                                                                                                                                           |
| XSS no comprovante                                                           | HTML com todo texto escapado, servido pela API com `Content-Security-Policy` restritiva, `nosniff` e `attachment`; só o dono baixa                                                                                                                                                                                    |
| Injeção de fórmula no relatório CSV                                          | CSV com aspas e quebras corretas e neutralização de fórmula (`=`, `+`, `-`, `@`); download direto da API, só admin                                                                                                                                                                                                    |
| Vendas de produtor misturadas ao histórico de compras do aluno               | o histórico do aluno só tem as compras dele (`student_checkout`) e os reembolsos que ele pediu                                                                                                                                                                                                                        |
| Afiliado ganhar comissão da própria compra                                   | autoindicação, clique vencido, link desligado e parceria não aprovada não geram comissão                                                                                                                                                                                                                              |
| Conta criada com e-mail alheio já confirmado no "finalizar conta"            | a conta nasce pelo cadastro normal (`AuthService.register`): o e-mail precisa ser confirmado pelo link                                                                                                                                                                                                                |
| Cupom "morto" furando o limite                                               | pedido `failed` e `in_process` seguram a reserva; se um link devolvido for pago, o pedido é liberado e o evento `coupon_overuse` avisa o financeiro                                                                                                                                                                   |
| Rajada de consultas ao Mercado Pago por reenvio idêntico do webhook          | a assinatura repetida em curto intervalo é descartada em memória antes de consultar o gateway                                                                                                                                                                                                                         |

## Limitações conhecidas

- **Compra sem conta (pré-sequestro):** o id do pedido viaja na URL de retorno do Mercado Pago, então quem o
  obtiver antes do comprador poderia definir a senha. É **latente** (nenhum pedido nasce sem dono) e o
  e-mail do dono ainda precisa ser confirmado. Antes de ligar compra sem cadastro, trocar por um link de
  "definir senha" enviado ao e-mail do pedido, com token no fragmento `#`.
- Mensagens de cupom ainda distinguem "já usou", "limite" e "mínimo": só chegam depois de o código existir e
  estar válido, exigem login e passam por limite por sessão (por cookie de sessão, não por conta).
- A comissão de afiliado é congelada na criação do pedido: se a parceria for revogada entre criar e pagar, a
  comissão ainda sai.
- O cliente HTTP do Mercado Pago e a assinatura foram conferidos com respostas simuladas; pagamento real
  contra a API do Mercado Pago depende de credenciais de teste e túnel https.
- Estorno parcial e boleto compensado em dias ficam fora: o reembolso estorna sempre o pedido inteiro.
- O estorno pelo painel ainda não foi conferido com uma conta real do Mercado Pago (no simulador, sim).
- Comprovante e relatório são HTML e CSV; PDF exigiria uma biblioteca nova (decisão de arquitetura).
- Se o Postgres abortar uma transação por deadlock, o efeito é um 500: o Mercado Pago reenvia a notificação
  e o navegador tenta de novo, sem dado inconsistente.
- A expiração do pedido pendente é calculada a partir da data de criação (não há coluna `expires_at`), e o
  limite de uma utilização por pessoa e cupom é garantido na transação, não por uma restrição `UNIQUE (coupon_id, user_id)`.
- O saldo disponível de produtor e afiliado depende do que este módulo grava: as `transactions` do produtor
  (`sale`, valor líquido) viram `refunded` no estorno, e a comissão de afiliado nasce `pending` (libera
  depois da janela de 30 dias).
