# Área do aluno

Módulos da API: `learning` (estudo) e `student` (painel, meus cursos, perfil).
Front: `features/student/{player,courses,dashboard,notes,questions,profile}` e as páginas `student`
(painel, meus cursos, player, notas, perguntas, perfil).

## API `learning` (`apps/api/src/modules/learning/`)

| Rota (`/api/learning/...`)                                                  | Regra de acesso                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `GET courses/:slug/player`                                                  | login + matrícula ativa/concluída (senão 404); só módulos/aulas **publicados** |
| `GET preview/lessons/:lessonId` (**pública**)                               | só aula marcada como prévia, publicada, de curso aprovado/publicado            |
| `PUT lessons/:id/progress`                                                  | login + matrícula + aula publicada do curso da matrícula                       |
| `POST lessons/:id/complete`                                                 | idem; quiz só conclui aprovado                                                 |
| `GET lessons/:id/quiz?courseId=`                                            | idem; **sem gabarito**                                                         |
| `POST lessons/:id/quiz/attempts`                                            | idem; correção, tentativas, nota mínima, conclusão                             |
| `GET/POST/PATCH/DELETE notes...`, `GET lessons/:id/notes`                   | sempre do usuário da sessão; nota alheia = 404                                 |
| `GET/POST/PATCH/DELETE questions...`, `GET courses/:c/lessons/:l/questions` | matrícula; vê as próprias perguntas + as públicas                              |
| `GET/PUT/DELETE courses/:id/review`                                         | só quem concluiu; 1 por matrícula; não mexe se o produtor respondeu            |

## API `student` (`apps/api/src/modules/student/`)

| Rota (`/api/student/...`)                  | O que faz                                          |
| ------------------------------------------ | -------------------------------------------------- |
| `GET dashboard`                            | gamificação, continuar assistindo, cursos e totais |
| `GET courses`                              | "Meus cursos"                                      |
| `GET/PATCH profile`, `PUT profile/avatar`  | perfil, edição (nome, bio, telefone) e avatar      |
| `GET/PUT profile/notification-preferences` | preferências de notificação                        |
| `GET profile/activity`                     | registro de atividade                              |
| `POST profile/password`                    | conferir a senha atual e trocar                    |

Todas as respostas usam `select` explícito. Formatos: player, cursos, painel, quiz e perguntas do player em
**camelCase**; "Minhas notas" e perfil em **snake_case**. Os services do front (`playerService`,
`courseService`, `notesService`...) são chamadores finos de `apiServer`.

## Gamificação (`apps/api/src/modules/gamification/`)

Tela `/student/conquistas` (menu "Conquistas") e card no painel do aluno.

| Rota                                               | O que faz                                                            |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `GET /api/student/gamification`                    | XP, nível, sequência, medalhas (ganhas e bloqueadas), últimos pontos |
| `GET /api/student/gamification/ranking/:id`        | top 10 do mês no curso + a posição de quem pergunta (só matriculado) |
| `PUT /api/student/gamification/ranking-visibility` | aparecer ou não no ranking                                           |
| `GET /api/producer/gamification/engagement`        | engajamento dos alunos do próprio produtor (Analytics)               |

- **Pontos** (`gamification.rules.ts`): aula concluída 10, quiz aprovado 20 (+10 se gabaritar), curso
  concluído 100, avaliação 15, pergunta 5 (até 3 por dia), cada dia seguido de estudo +5.
- **Cada fato pontua uma vez:** `xp_events` tem chave única (usuário + origem + fato). Repetir aula, reenviar
  quiz ou reeditar a avaliação não soma de novo. Os totais em `user_gamification` são atualizados com a linha
  travada (ações simultâneas não se atropelam).
- **Níveis** pedem cada vez mais XP (100, 300, 600, 1000...), com nome (Iniciante, Aprendiz, Curioso...).
- **Sequência:** dias seguidos (horário de Brasília) com pelo menos uma aula concluída; se pular um dia,
  recomeça. Na tela, sequência de quem não estudou ontem nem hoje aparece zerada.
- **Medalhas** (11): primeira aula, 10 e 50 aulas, primeiro curso, 3 cursos, quiz gabaritado, sequência de
  3/7/30 dias, primeira avaliação e primeira pergunta. Subir de nível e ganhar medalha avisam no sino.
- **Ranking** por curso, do mês corrente (zera todo mês), só com primeiro nome e inicial; quem desliga
  "Aparecer no ranking" some da lista dos outros.
- Os pontos chegam pelos avisos do `learning` (`LearningActivityService` e `CourseCompletionService`),
  depois do commit: falha na gamificação nunca desfaz nem trava o estudo.

## Conclusão do curso e certificado

`CourseCompletionService` (`learning/course-completion.service.ts`, disponibilizado pelo `LearningModule`).
Quando o aluno chega a 100% (no `PUT progress`, no `POST complete` ou ao ser aprovado no quiz) a matrícula
vira `completed` e, **depois do commit**, o `learning` emite o evento `{ enrollmentId, studentId, courseId,
reason }`. `reason` é `first_completion` (a matrícula acabou de virar `completed`) ou
`already_completed_without_certificate` (já estava concluída, sem `certificate_url`, e o aluno concluiu uma
aula nova).

O `CertificatesModule` registra o ouvinte (`onCourseCompleted`) e emite o certificado de forma idempotente
(ver [certificados.md](certificados.md)). Falha do ouvinte nunca desfaz nem quebra o progresso: só é
registrada no log.

Também disponibilizados pelo `LearningModule`: `LearningAccessService` (matrícula e aula publicada) e
`ProgressService`. `sanitizeLessonHtml` (`learning/lesson-html.ts`) limpa o HTML das aulas na saída; a
gravação pelo produtor e pelo admin sanitiza também na entrada.

## Regras de negócio

- O percentual, `completed_lessons`, `status` e `completed_at` da matrícula são **calculados no servidor** a
  partir de `lesson_progress`. A aula concluída guarda a **primeira** data de conclusão.
- Tudo filtra `is_published` (módulo e aula): player, progresso, quiz, notas e perguntas. "Meus cursos" e o
  painel contam total de aulas e duração só de aulas publicadas, coerente com o percentual do player.
- `last_accessed_at` é gravado ao abrir o curso (no máximo 1 vez por minuto) e a cada progresso ou
  conclusão.
- Aula de quiz com `quiz_settings` só conclui com tentativa aprovada (`403 quiz_not_passed`). O gabarito e a
  explicação só voltam depois de responder **e** só se `show_answers_after` estiver ligado (inclusive em
  tentativas antigas relidas).
- Pergunta exige matrícula ativa ou concluída e aula do curso; avaliação só com matrícula `completed`, e
  recalcula `courses.average_rating` e `courses.total_reviews`. Nota exige matrícula e aula do curso.
- Quiz: na primeira tentativa a resposta de cada pergunta só fica registrada (a API não devolve correção antes de a pessoa ter uma tentativa finalizada); a correção e o gabarito vêm ao finalizar. Nas tentativas seguintes cada resposta já mostra a correção.
- Perfil: campo em branco **limpa** bio e telefone; telefone só aceita dígitos e `()+-.`. O avatar só aceita
  arquivo enviado pela própria pessoa (`/api/files/public/public/avatars/<id>/…`).
- Painel: lista só matrículas ativas ou concluídas. `GET dashboard` não grava a linha de gamificação (quem
  ainda não pontuou vê os valores iniciais).
- Aula do tipo `file` com `content_url` apontando para os buckets privados recebe link assinado válido por
  1 h; URLs externas passam como estão. O player só assina arquivo do bucket `documents` na pasta do
  **próprio produtor do curso**.
- Erros de quiz e aula trazem texto em português e um código estável em `code` (ex.: `RETAKE_NOT_ALLOWED`);
  o `apiServer` repassa o `code`.

## Proteções

- **O aluno não forja progresso nem conclusão.** Nenhuma rota recebe campo de matrícula: percentual,
  `completed_lessons`, `status` e `completed_at` saem do servidor, e um corpo com campos extras é ignorado. Certificado e `certificate_url` só nascem pela emissão do servidor.
- **O gabarito do quiz não vaza antes da hora.** O carregamento do quiz não seleciona `is_correct` nem a
  explicação das perguntas; o gabarito só volta depois de responder e só com `show_answers_after` ligado.
- **Progresso só em aula válida.** Aula, módulo, curso e matrícula são conferidos pelo servidor; aula de
  outro curso responde 403/404.
- **Rascunho não é acessível.** Aula e módulo não publicados ficam fora do player, do progresso, do quiz, das
  notas e das perguntas.
- **Quiz não é concluído sem passar.** "Marcar como concluído" numa aula de quiz exige tentativa aprovada.
- **Correção do quiz serializada.** Corre em transação com a matrícula travada (`FOR UPDATE`): três
  finalizações simultâneas geram as tentativas 1, 2 e 3 (testado).
- **HTML de aula sem script.** `content_text` é sanitizado no servidor (`sanitize-html`, lista de tags
  permitidas, sem script, evento, iframe ou `javascript:`; `style` só `text-align`; links com
  `rel=noopener`).
- **Perfil sem colunas sensíveis.** A resposta não devolve CPF, endereço nem comissão, e o update aceita só
  nome, bio e telefone.
- **Busca com parâmetro.** O texto do usuário nunca é interpolado no filtro: parâmetro SQL, curingas
  escapados, NFKC antes de escapar.
- **Troca de senha protegida.** Derruba as **outras** sessões, invalida links de redefinição pendentes e tem
  limite de tentativas: a conta trava por 15 min após 5 erros (contador em memória do processo, além do
  limite por IP).
- **Material de outro produtor e certificados não são assinados** pelo player: só o bucket `documents` da
  pasta do produtor do curso.

## Limitações conhecidas

- **Quiz, correção pergunta a pergunta** (`finalize:false`): mostra acerto e gabarito por pergunta sem gravar
  nada, então um aluno mal-intencionado pode "sondar" respostas antes de finalizar. Fechar isso exige mudar a
  regra do produto (gravar a primeira resposta de cada pergunta por tentativa).
- `time_limit_minutes` do quiz é aplicado só no cliente.
- A conclusão de aula de vídeo é **declarada pelo cliente** (o servidor não vê o vídeo). O que não é
  forjável é o curso, a matrícula e o certificado.
- O limite de erros da troca de senha é em memória: com várias instâncias da API, cada uma conta
  separado.
- O front não tem tela para o aluno editar ou apagar pergunta (só as rotas existem). A avaliação do curso fica no player, no cartão "Você concluiu o curso!".
- Opcional, se o volume crescer: índice parcial `(student_id, lesson_id) WHERE passed` em `quiz_attempts`.
