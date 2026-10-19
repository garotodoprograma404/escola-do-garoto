# Cursos: criação (produtor) e administração (admin)

Módulos da API: `apps/api/src/modules/producer-courses` e `apps/api/src/modules/admin-courses`.
Front: `features/producer/course-create`, `features/producer/courses`, `features/admin/courses` e as páginas
`app/(dashboard)/{producer,admin}/courses/**` (mais a pré-visualização de auditoria, que chama a action
`get-course-preview`).

## API do produtor (`/api/producer/courses`, só papel `producer`)

| Rota                                  | Observação                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`                               | filtros `search`, `status`, `sortBy`, `sortOrder`; receita por curso e `review_feedback` (recado do admin de um curso rejeitado ou devolvido) |
| `GET /categories` (producer ou admin) | categorias ativas                                                                                                                             |
| `GET /commission-rate`                | só do produtor logado                                                                                                                         |
| `GET /:id`, `GET /:id/edit`           | `edit` devolve o formato do assistente (`module-N`, `lesson-N`)                                                                               |
| `POST /`                              | curso + módulos + aulas + quiz em UMA transação, nasce `pending_review`                                                                       |
| `POST /drafts`                        | aceita entrada incompleta, sempre `draft`                                                                                                     |
| `PUT /:id`                            | `options.skipCurriculumUpdate` mantém o currículo                                                                                             |
| `POST /:id/submit`                    | mesmas conferências da criação (módulos, aulas, URLs, quiz)                                                                                   |
| `DELETE /:id`                         | recusa curso com alunos matriculados (409)                                                                                                    |

## API do admin (`/api/admin/courses`, TODAS com `@Roles(['admin'])`)

`GET /` (lista paginada), `/status-counts`, `/metrics`, `/categories`, `/role-users?role=producer|student`,
`GET /:id`, `/:id/details`, `/:id/content`, `/:id/audits`, `/:id/editor`, `/:id/preview` (admin ou produtor
dono), `POST /` (modal "Novo curso"), `POST /complete`, `POST /drafts`, `PUT /:id/complete`, `PATCH /:id`
(edição rápida), `POST /:id/approve | reject | request-changes | move-to-draft | archive | enroll`.

Arquivar tira o curso do ar sem apagar nada (`status='archived'`, notifica o produtor e audita): quem já está
matriculado mantém o acesso, e o curso volta com "mover para rascunho". Na tela, a lista tem a aba
"Arquivados" e o botão "Pedir Alterações" fica na janela de decisão.

Aprovar, rejeitar, pedir alterações e mover para rascunho acontecem **na mesma transação**: trocam o status,
gravam `course_audits` (decisão, feedback, mudanças pedidas), criam a notificação do produtor
(`NotificationsService`) e registram em `admin_audit_log` (`AuditService`). Aprovar também marca módulos e
aulas como publicados. Aprovar, rejeitar e pedir alterações recusam curso arquivado. `enroll` cria o papel
de aluno se faltar (ou reativa), insere a matrícula sem pagamento e recalcula `courses.total_students` com o
curso travado (`FOR UPDATE`).

## Regras de negócio

- **Ciclo de status:** criação completa → `pending_review`; rascunho → `draft`. O produtor só edita o
  próprio curso (`producer_id` = sessão) e curso arquivado não é editado. Curso aprovado que é editado volta
  para `pending_review`, sai do ar (`is_published=false`) e seus módulos e aulas são despublicados. O
  produtor só envia para revisão curso em `draft` ou `rejected`. O admin aprova, rejeita ou pede mudanças.
- **Campos só do admin:** `price_locked_by_admin`, `coupons_enabled`, `is_featured`, `admin_notes`.
- **Preço:** `discount_price < price` (zod + check do banco), preço pago mínimo de R$ 9,90, curso grátis sem
  promoção. Contas em centavos inteiros (`toCents`); a coluna é `numeric(10,2)` em reais.
- **Contadores:** `total_lessons` e `total_duration_minutes` são recalculados no servidor a cada gravação do
  currículo.
- **Slug único:** conflito vira 409; rascunho ganha sufixo em vez de erro.
- **Editar curso preserva o progresso dos alunos:** módulo e aula existentes (`module-N` e `lesson-N` do
  próprio curso) são atualizados no lugar; só o removido é apagado e só o novo é criado. O quiz é regravado
  por aula.
- **Rascunho do admin** grava também o currículo e nunca falha por slug repetido.
- **Edição rápida do admin** (`PATCH /:id`): ao publicar, publica também módulos e aulas e mantém
  `published_at` se o curso já estava no ar. A regra é "publicado = `approved`, não publicado = `draft`".
- **Conteúdo das aulas:** `content_text` das aulas de texto é sanitizado no servidor (`sanitize-html`, só as
  tags do editor TipTap). Vídeo de aula só YouTube, Vimeo ou arquivo direto. Imagem de questão aceita link
  https ou arquivo enviado pela API (restrição também no banco).
- **Admin:** métricas e listagem usam `coalesce(display_name, full_name)` para o nome do produtor;
  `getCourses` sem paginação limita a 200 itens por chamada.

### Front

As Server Actions e serviços são chamadores finos de `apiServer` e devolvem `{ success, error }` com campos
em snake_case. O zod 3 do front valida antes (só para a mensagem) e a API valida de novo. O id do usuário
usado no upload (`BasicInfoStep`, `LessonFormModal`, `QuestionForm`) vem do hook `useCurrentUserId`
(`GET /api/auth/me`). Arquivo enviado é reconhecido pelo prefixo `/api/files/public/`. Helpers:
`course-create/lib/api-error.ts` e `lib/use-current-user-id.ts`.

## Proteções

- **Toda rota admin exige o papel admin.** Aprovar, rejeitar, pedir alterações, edição rápida, leitura de
  conteúdo, detalhes e auditorias e listagens são `@Roles(['admin'])`.
- **Produtor não aprova o próprio curso.** Ele só usa os endpoints dele, que ignoram `status`,
  `is_published`, `is_featured` e `price_locked_by_admin`.
- **Preço travado pelo admin não é burlado.** Mudar preço ou promoção de curso travado responde 403.
- **Sem XSS armazenado nas aulas de texto.** O HTML é sanitizado na gravação, inclusive no rascunho.
- **URLs perigosas são recusadas.** Capa, thumbnail, trailer e aulas de arquivo aceitam só `http(s)` ou
  arquivo enviado pela nossa API; `javascript:` e `data:` não passam.
- **Tamanho tem teto.** Limites de módulos (100), aulas por módulo (300), questões por quiz (200),
  alternativas (12), itens de lista (50) e tamanhos de texto.
- **Dono e papel do dono são validados.** O admin só atribui curso a quem tem papel de produtor ativo; o id
  de aula ou módulo vindo do front só vale se pertencer ao curso editado.
- **Gravação em várias tabelas é atômica.** Criação e edição rodam numa transação: uma falha no meio não
  deixa curso pela metade nem apaga o currículo.
- **Matrícula manual controlada.** Só admin; contagem de alunos sob lock; papel de aluno sem duplicar; administrador não vira aluno; ação auditada.
- **Curso com alunos não é apagado.** `DELETE` responde 409 se houver matrículas, para não levar progresso
  de ninguém em cascata.
- **Resposta sem dado desnecessário.** `select` explícito; a pré-visualização só é entregue ao admin ou ao
  produtor dono.

## Limitações conhecidas

- Aula do tipo arquivo (`type: 'file'`) enviada por upload fica no bucket privado `documents`; a URL
  devolvida pelo upload só funciona para o aluno depois que o player a converte em URL assinada (ver
  [aluno.md](aluno.md)).
- Imagem de questão enviada como arquivo é convertida em link absoluto com `WEB_ORIGIN` só quando ele é
  https; em desenvolvimento (http) a API responde 400 pedindo um link https.
- `GET /api/admin/courses/:id/preview` aceita o produtor dono, além do admin.
