# Painel do produtor e candidatura a produtor

Dashboard, analytics, financeiro e saques, avaliações, perguntas e respostas, academia do produtor, perfil
do produtor, candidatura a produtor (`producer_applications`) e contatos da página "seja produtor"
(`producer_leads`) com a tela do admin. Os cursos do produtor (`producer/courses/**`, `course-create`) estão
em [cursos.md](cursos.md).

## API (`apps/api/src/modules/producer/`)

Toda rota do painel usa `@Roles(['producer'])` e filtra pelo `user.id` da **sessão** (nunca por id do
body ou da query). Respostas com `select` explícito. O dinheiro é calculado em **centavos inteiros**
(`money.ts`) e devolvido em reais, formato que as telas esperam.

| Rota                                                                          | O que faz                                                                         |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/producer/dashboard/{stats,revenue,recent-sales,course-performance}` | Cards, gráfico de 30 dias, 5 últimas vendas, 5 melhores cursos. Agregação no SQL. |
| `GET /api/producer/analytics?dateRange=&courseId=`                            | Relatório do produtor (regras em "Analytics" abaixo). Agregação no SQL.           |
| `GET /api/producer/financials?range=&type=`                                   | Saldo (disponível/pendente/total/histórico) + lista de movimentações (teto 500).  |
| `POST /api/producer/withdrawals`                                              | Pede saque (conta `producer`). Veja "Saque" abaixo.                               |
| `GET /api/producer/reviews`, `POST /api/producer/reviews/:id/reply`           | Lista e responde avaliações (`course_reviews.response`).                          |
| `GET /api/producer/questions`, `POST /api/producer/questions/:id/answer`      | Lista e responde perguntas; avisa o aluno pelo sino (`NotificationsService`).     |
| `GET /api/producer/course-options`                                            | Cursos do produtor para os filtros das telas.                                     |
| `GET /api/producer/academy`, `GET …/:id`, `POST …/:id/complete`               | Academia: conteúdo publicado + progresso de quem está logado.                     |
| `GET/PATCH /api/producer/profile`, `PUT …/avatar`, `POST …/password`          | Perfil público (slug único, redes, `public_profile_enabled`), avatar e senha.     |
| `POST /api/producer-leads` (**público**)                                      | Contato "seja produtor" do visitante.                                             |
| `POST /api/producer-applications`, `GET …/me`                                 | Candidatura formal de conta logada.                                               |
| `GET/PATCH /api/admin/producer-leads[/:id]`                                   | Admin lista e atualiza o funil dos contatos.                                      |
| `GET /api/admin/producer-applications`, `POST …/:id/review`                   | Admin lista e aprova/recusa candidaturas.                                         |

## Saque

`WithdrawalsService.requestWithdrawal` roda numa transação que trava a linha do usuário
(`SELECT … FOR UPDATE` em `users`), calcula o saldo **dentro da transação** com a mesma função que a tela de
financeiro usa (`loadProducerBalance`/`computeProducerBalance`) e só então grava. Valor mínimo de R$ 50,00,
no máximo 2 casas decimais, método `pix` ou `bank_transfer` com os dados obrigatórios,
`account_scope='producer'` sempre.

Saldo disponível = vendas concluídas **liberadas** − reembolsos − saques do produtor em `pending`,
`approved`, `processing` ou `completed`. Saque recusado ou cancelado devolve o saldo. A venda fica **a
liberar** nos 7 dias do prazo de reembolso do aluno (`REFUND_WINDOW_DAYS`) e só depois entra no
disponível: o produtor não saca um valor que ainda pode voltar para o aluno. A compra que o produtor faz
como aluno nunca entra nessas contas. O formulário de saque
(`requestWithdrawalAction` e `WithdrawalForm`) é compartilhado com o painel do afiliado: chama
`POST /api/producer/withdrawals` para produtor e `POST /api/affiliate/withdrawals` para afiliado, com o
mesmo corpo (`amount`, `method`, `pix_key`, `bank_code`, `bank_agency`, `bank_account`, `account_type`).

## Candidatura

Aprovar (`POST /admin/producer-applications/:id/review`) acontece em **uma transação**: trava a candidatura,
marca como aprovada, monta o perfil de produtor (nome de exibição, bio, área, redes, comissão padrão de 10%,
verificado), concede ou **reativa** o papel `producer` em `user_roles` e grava a auditoria
(`admin_audit_log`, ação `approve` ou `reject`). Candidatura já analisada responde 409. Recusada, a pessoa
pode reenviar: a mesma linha é reaproveitada. A API não envia e-mail nem aviso ao candidato na decisão.

## Regras de negócio

- Listas têm teto: movimentações 500, avaliações 200, perguntas 200, leads 300. As estatísticas (totais,
  médias, distribuição) valem para o conjunto filtrado inteiro; só a lista é cortada.
- Dashboard: "saques pendentes" soma só saques da conta de produtor; "receita do mês" usa o mês no fuso
  `America/Sao_Paulo`.
- Academia: conteúdo inexistente ou em rascunho dá 404. A lista não leva `articleContent`; o detalhe leva.
- Responder pergunta avisa o aluno pelo sino (`question_answered`, link `/student/questions`), só na primeira
  resposta (editar não reenvia).
- Perfil: apagar o campo do slug **mantém** o endereço já divulgado; `previous_slug` do formulário só serve
  para revalidar a página antiga. Os parâmetros `userId` que os services do front ainda recebem são
  ignorados: o produtor é sempre o da sessão.
- Candidatura formal: a conta logada se candidata em `/minha-conta/produtor` (link na página pública
  `/become-producer`, que também recebe contatos de visitantes em `producer_leads`). O admin aprova ou recusa
  em `/admin/producer-leads`; aprovar concede o papel e a pessoa passa a abrir `/producer`. Recusada, ela vê o
  motivo e pode reenviar. O perfil público do instrutor é da área do catálogo
  ([catalogo.md](catalogo.md)).
- O formulário de saque revalida só caminhos `/producer…` e `/affiliate…`.

## Proteções

- **Dois saques simultâneos não estouram o saldo.** O saldo é calculado sob lock, dentro da transação.
- **Tela e validação usam a mesma conta.** O saldo exibido desconta saques pendentes, aprovados e em
  processamento, igual à validação do saque.
- **Papel conferido no servidor.** `@Roles(['producer'])` em toda rota do painel.
- **Avatar só do próprio usuário.** `avatar_url` só vale como
  `/api/files/public/public/avatars/<id da própria pessoa>/<arquivo>` (o que o upload devolve).
- **Perfil público sem links perigosos.** `cover_url`, site, Instagram e demais redes aceitam só `http(s)`
  (a capa também aceita arquivo da plataforma), o que evita XSS no perfil do instrutor. Redes da candidatura
  seguem a mesma regra, porque são copiadas para o perfil ao aprovar.
- **Troca de senha protegida.** Limite de 5 por minuto por sessão, exige a senha atual, nova senha diferente
  da atual, e encerra as outras sessões e os links de redefinição pendentes (a sessão atual continua).
- **Leads públicos limitados.** A API valida, ignora o mesmo contato repetido (e-mail + telefone em 24 h) e
  limita 3 contatos por e-mail por dia (com lock por e-mail, vale também para envios simultâneos), mais um
  teto de 2000 por hora só contra inundação do banco. Isso vale mesmo quando a chamada vem do servidor do
  Next, que não passa pelo limite por IP.
- **Aprovação de candidatura atômica e idempotente.** Transação com lock: não aprova duas vezes, reativa
  papel revogado e audita.
- **Candidatura recusada não trava a pessoa.** O reenvio reaproveita a mesma linha.
- **Nada de curso alheio.** Responder avaliação ou pergunta de curso de outro produtor devolve 404, igual a
  "não existe", sem revelar o que há no curso de outro produtor.
- **Nome de aluno só dos próprios cursos.** Em vendas e movimentações, o nome do aluno só aparece quando a
  matrícula é de curso DO produtor.

## Analytics

Tela `/producer/analytics` (menu do produtor), com filtro por curso e por período (7 dias, 30 dias, 90 dias,
1 ano ou tudo). Só enxerga os cursos do próprio produtor: um `courseId` alheio não devolve nada.

- **Estado de hoje** (não muda com o período): total de alunos, conclusão, em andamento, funil de retenção
  (matriculados → iniciaram → 50% → concluíram) e alunos ativos (acesso nos últimos 30 dias).
- **Depende do período:** novos alunos, crescimento por dia, vendas e receita. A receita é a do próprio
  produtor (já sem a taxa da plataforma e a comissão de afiliado) menos os reembolsos, como no painel.
- **Origem das vendas é real:** vendas com atribuição de afiliado × vendas diretas (`has_affiliate_attribution`
  gravado na venda). Não há divisão estimada.
- **Nota média** é ponderada pelo número de avaliações; curso sem avaliação não puxa a média para zero.
- **Engajamento (gamificação):** alunos com sequência de estudos ativa (estudaram hoje ou ontem) e a média de
  dias seguidos, alunos com pelo menos uma medalha e XP ganho nos cursos do produtor no mês. Respeita o
  filtro de curso; não depende do período.

## Limitações conhecidas

- **Anti-spam do "seja produtor":** como a server action chama a API com a chave interna, o limite por IP
  não vale para esse formulário; o limite por visitante precisa ficar na borda (proxy reverso) ou virar
  captcha ou repasse do IP real. Sem isso, um spammer pode lotar a lista do admin (sem bloquear contato
  legítimo).
- **Reembolso pendente** não reserva saldo: o saldo só desconta reembolsos concluídos. Uma regra de prazo de
  garantia ou de reserva do reembolso `pending` é uma decisão de produto.
- Não existe rota geral de "trocar senha" em `auth`: `POST /api/producer/profile/password` serve só ao
  painel do produtor, e o aluno e o admin têm as suas.
