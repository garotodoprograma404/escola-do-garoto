# Admin: usuários, painel, suporte, chat e notificações

Módulos da API: `admin-users`, `admin-dashboard`, `support` e `chat`. Front: `features/admin/{users,dashboard,profile,support}`,
`features/student/support`, `features/chat`, `features/auth/services/profileService.ts`,
`shared/services/notificationService.ts` e `shared/actions/notification-actions.ts`.

## API (`apps/api/src/modules`)

| Módulo            | Rotas (prefixo `/api`)                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin-users`     | `GET/POST /admin/users`, `GET /admin/users/:id`, `GET /admin/users/:id/details` (com matrículas), `PATCH /admin/users/:id`, `DELETE /admin/users/:id` (desativa). Perfil do admin: `GET/PATCH /admin/profile`, `PUT /admin/profile/avatar`, `PUT /admin/profile/password`. Tudo `@Roles(['admin'])`. |
| `admin-dashboard` | `GET /admin/dashboard/{metrics,activity,categories,recent}` (`@Roles(['admin'])`), tudo em agregação SQL.                                                                                                                                                                                            |
| `support` (aluno) | `POST/GET /support/tickets`, `GET /support/tickets/stats`, `GET /support/tickets/:id`, `GET/POST /support/tickets/:id/messages`, `POST /support/tickets/:id/close`, `GET /support/my-courses`. Sempre filtrado pelo usuário da sessão.                                                               |
| `support` (admin) | `GET /admin/support/{stats,tickets}`, `GET /admin/support/tickets/:id{,/messages,/context}`, `POST /admin/support/tickets/:id/assign`, `PATCH /admin/support/tickets/:id/status` (`@Roles(['admin'])`).                                                                                              |
| `chat`            | `GET/POST /chat/tickets/:id/messages`, `PUT /chat/tickets/:id/typing`, `GET /chat/tickets/:id/stream` (SSE), `GET /chat/presence/:userId`.                                                                                                                                                           |
| `chat` (sino)     | `GET /notifications`, `GET /notifications/stats`, `GET /notifications/stream` (SSE), `POST /notifications/read-all`, `POST /notifications/:id/read`, `DELETE /notifications/:id`, `DELETE /notifications/read`.                                                                                      |

Formatos: usuários e tickets do admin em camelCase; `chat_messages`, `notifications`, tickets do aluno e
perfil do admin em snake_case.

## Front

Services e actions são chamadores finos de `apiServer`/`apiRequest` e devolvem `{ success, error }`,
`{ error }` ou `null` quando não existe.

- **Tempo real:** `ChatBox`, `RealtimeNotifications` e `OnlineStatus` abrem um `EventSource` no mesmo
  domínio (`/api/chat/tickets/:id/stream`, `/api/notifications/stream`; o cookie de sessão autentica) e
  **enviam** por POST/PUT. Se o stream cair, o `ChatBox` volta a consultar a conversa a cada 3 s e o
  navegador reconecta sozinho.
- `OnlineStatus` consulta `GET /chat/presence/:userId` a cada 30 s.
- `RealtimeNotifications` mostra um toast para cada notificação nova (e pode dar `router.refresh()`).

## Regras de negócio

- **Lista de usuários:** o papel mostrado é o papel ativo mais recente (ou o último que teve, ou aluno).
  Status: `suspended` se a conta está suspensa, o perfil desativado ou não há papel ativo; `pending_kyc` se
  o e-mail não foi confirmado; senão `active`. Filtros e busca por nome, e-mail e CPF acontecem no banco, com
  paginação real e ordem fixa (mais novo primeiro).
- **Criar usuário:** conta com e-mail já confirmado + perfil + um papel; produtor nasce com comissão padrão
  de 10%.
- **Editar:** nome, telefone, CPF, nascimento, papel (um só ativo após a troca), status (suspenso, banido e
  bloqueio financeiro = conta suspensa; ativo e pendente = conta ativa) e comissão da plataforma para
  produtor. Salvar só o nome de quem tem dois papéis não revoga o outro.
- **"Excluir" é desativar:** nada é apagado (matrículas, pedidos, tickets e financeiro ficam íntegros).
- **Papéis:** trocar papel revoga (`is_active=false`, `revoked_at`, `revoked_by`) e nunca apaga histórico.
  Não existe o papel "Super Admin" (o enum `user_role_type` não tem esse valor).
- **Tickets:** o aluno só vê os próprios; o admin vê todos, responde, atribui (`in_progress`) e fecha. O
  aluno fecha o próprio ticket; resposta do aluno num ticket resolvido volta para `waiting_customer`
  (a resposta pelo chat usa o mesmo `chat_messages`, mas só a aba "Histórico" reabre o ticket). Ticket
  fechado não recebe mensagem. A conversa junta `ticket_messages` e `chat_messages` em ordem cronológica. O
  admin vê o e-mail real do cliente. `average_response_time` do aluno é calculado em horas; "resolvidos
  hoje" e o gráfico "por dia" usam o horário de Brasília (`America/Sao_Paulo`).
- **Limites de texto:** mensagem de chat 4000 caracteres, título de ticket 200, descrição 5000.
- **Painel do admin:** receita = soma de `platform_amount` dos itens de pedidos `approved` e
  `free_completed` (data de referência = finalizado, senão pago, senão criado); variação de 30 dias contra os
  30 anteriores; cursos publicados e pendentes; gráfico dos últimos 7 dias; top 5 categorias; 5 atividades
  recentes (pedidos e saques).
- **Notificações de suporte:** resposta da equipe → aluno; resposta do aluno → atendente designado; ticket
  novo → admins; atribuição ou mudança de status → aluno; aluno fechou → atendente. Se já existe uma não
  lida do mesmo ticket, não cria outra, para um chat movimentado não encher o sino.

## Proteções

- **Rotas de admin exigem o papel no servidor.** Criar, editar, desativar e listar usuários (e-mails e
  CPFs) são `@Roles(['admin'])` em toda rota `/admin/*`; a decisão nunca é do botão.
- **Quem escreve no chat vem da sessão.** O autor é o usuário da sessão e `is_staff` vem do papel de admin:
  um aluno não aparece como "Suporte".
- **O aluno só fecha o próprio ticket.** Status, prioridade e responsável não são alteráveis por ele.
- **Notas internas só para a equipe.** `ticket_messages.is_internal` nunca chega ao aluno dono do ticket.
- **Curso relacionado do ticket só se matriculado.** Um id de curso qualquer não devolve o título (nem de
  rascunho).
- **Só admin ativo pode ser responsável** por um ticket.
- **Avatar só de arquivo enviado** pela própria pessoa (nada de imagem externa ou rastreador).
- **Troca de senha** exige a senha atual, tem limite de tentativas (por IP e por sessão) e encerra as
  **outras** sessões.
- **Suspender conta derruba a sessão.** `users.status='suspended'` e as sessões são apagadas na hora; os
  streams de tempo real já abertos fecham em até 30 s.
- **O sistema nunca fica sem admin.** Ninguém suspende, desativa ou tira o próprio acesso de admin, e o
  último admin ativo nunca sai do ar (`pg_advisory_xact_lock` contra duas ações simultâneas).
- **Auditoria** (`admin_audit_log`) de criar, editar, ativar, desativar e excluir usuário, trocar a senha do
  admin e atribuir ou mudar o status de ticket. Senha e hash nunca entram no registro.
- **Busca sem curinga escondido.** `LIKE` com normalização NFKC no banco antes de escapar `\ % _`.
- **Notificação só do dono.** Toda leitura e escrita é filtrada pelo dono; ids inválidos dão 400.
- **Tempo real só para quem pode.** O stream de ticket é só para participante (dono, designado ou admin),
  revalidado a cada 30 s (sessão, conta ativa, papel e participação atuais); o stream do sino entrega só as
  notificações da própria sessão; no máximo 6 streams abertos por pessoa; presença só para quem tem motivo
  para saber.

## Como o tempo real funciona

```
Navegador ── GET /api/chat/tickets/:id/stream (EventSource, cookie) ──▶ API
          ◀── event: ready | message | typing | ticket | ping | closed ──
Navegador ── POST /api/chat/tickets/:id/messages / PUT .../typing ──▶ API ── RealtimeBus ──▶ streams do ticket
```

- `RealtimeBus` (RxJS `Subject` em memória) entrega por ticket; o **controller** decide quem pode assinar.
- O sino (`/api/notifications/stream`) consulta o banco a cada 5 s (índice por usuário) para pegar
  notificações criadas por **qualquer** módulo, e o fluxo de suporte "cutuca" o stream para entrega
  imediata.
- Cabeçalhos do SSE: `Content-Type: text/event-stream`, `Cache-Control: ... no-transform ...` (impede o Next
  de comprimir ou bufferizar o stream) e `X-Accel-Buffering: no`. Batimento (`ping`) a cada 25 s.
- Ao encerrar do servidor, vem o evento `closed` e o fim do stream; a reconexão do `EventSource` recebe
  401, 403 ou 404 e o navegador desiste.

### Conferindo o repasse pelo Next

Com o `pnpm dev` no ar e logado:

```bash
curl -N -H "Cookie: vox_session=<cookie>" http://localhost:3000/api/notifications/stream
# deve imprimir "event: ready" na hora e "event: ping" a cada ~25 s (sem esperar fechar)
```

Se o Next bufferizar (o sinal é nada aparecer até fechar), defina `compress: false` no `next.config.ts`.
Em **produção** o `/api/*` nem passa pelo Next: vai direto do Caddy para o Nest (`infra/producao/Caddyfile`).
O `reverse_proxy` do Caddy descarrega `text/event-stream` na hora; confira só que o `encode zstd gzip` não
segura o stream (o Nest manda `no-transform`; se ainda assim bufferizar, tire `text/event-stream` do
`encode`).

## Limitações conhecidas

- **Uma instância só:** barramento e presença ficam em memória. Para escalar horizontalmente, trocar por
  Postgres `LISTEN/NOTIFY` ou Redis (a interface `RealtimeBus` isola isso).
- `NotificationBell` e `RealtimeNotifications` existem como componentes, mas não estão montados em nenhum
  layout do dashboard.
- `typing_indicators` guarda o último estado por (ticket, usuário): uma linha por par, não cresce.
- Anexos de ticket: a API devolve `attachments` de `ticket_messages` quando existem, mas não há tela de
  upload de anexo.
- `POST /admin/support/tickets/:id/assign` aceita o `adminId` de outro admin; a tela só atribui a quem
  clica.
