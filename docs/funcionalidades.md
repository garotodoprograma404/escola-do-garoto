# Funcionalidades

Mapa de tudo que o sistema faz, por papel. É a fonte única para saber o que funciona e o que ainda está
incompleto.

Legenda:

- **Situação:** ✅ completo · ⚠️ incompleto ou desligado (a observação explica) · ❌ não existe

## Conta e acesso

| Funcionalidade                 | Rota                                       | Situação | Observação                                              |
| ------------------------------ | ------------------------------------------ | -------- | ------------------------------------------------------- |
| Cadastro de aluno              | `/register`                                | ✅       | exige confirmar o e-mail                                |
| Confirmação de e-mail por link | `/auth/verify-email`                       | ✅       | link com token no fragmento (`#`)                       |
| Login e logout                 | `/login`                                   | ✅       | redireciona para o painel do papel                      |
| Recuperar e redefinir senha    | `/forgot-password`, `/auth/reset-password` | ✅       |                                                         |
| Proteção de rotas por papel    | `proxy.ts`                                 | ✅       | aluno não entra em `/admin`                             |
| Entrada rápida (demonstração)  | `/login`                                   | ✅       | só com `DEMO_MODE`: entra como aluno, produtor ou admin |

## Público

| Funcionalidade                             | Rota                                        | Situação | Observação                                                      |
| ------------------------------------------ | ------------------------------------------- | -------- | --------------------------------------------------------------- |
| Home (destaques, produtor, afiliados)      | `/`                                         | ✅       |                                                                 |
| Banners e vitrines gerenciados pelo admin  | `/`                                         | ✅       | sem banner ativo a home mostra a apresentação padrão            |
| Catálogo com filtros e ordenação           | `/catalog`                                  | ✅       |                                                                 |
| Busca global (cursos, instrutores, posts)  | `/search`                                   | ✅       |                                                                 |
| Página do curso (currículo, prévia grátis) | `/courses/[slug]`                           | ✅       |                                                                 |
| Avaliações dos alunos na página do curso   | `/courses/[slug]`                           | ✅       | nota média, distribuição e comentários                          |
| Perfil público do instrutor                | `/instrutor/[slug]`                         | ✅       |                                                                 |
| Blog (lista e post)                        | `/blog`, `/blog/[slug]`                     | ✅       | views contadas com limite por visitante                         |
| Curtir post do blog                        | `/blog/[slug]`                              | ✅       | exige login (visitante vai ao login e volta)                    |
| Verificar certificado por código           | `/certificates/verify`                      | ✅       | mostra só nome, curso, datas e situação                         |
| Páginas institucionais e legais            | `/termos-de-uso` etc.                       | ✅       | textos vêm das configurações do admin                           |
| Candidatura para ser produtor              | `/become-producer`, `/minha-conta/produtor` | ✅       | conta logada se candidata, o admin aprova e o papel é concedido |
| Candidatura para ser afiliado              | `/afiliados`                                | ✅       |                                                                 |

## Compra e matrícula

| Funcionalidade              | Rota                                     | Situação | Observação                       |
| --------------------------- | ---------------------------------------- | -------- | -------------------------------- |
| Carrinho                    | `/cart`                                  | ✅       | adicionar, ver o valor e remover |
| Cupom de desconto           | `/cart`, `/checkout`                     | ✅       | exige login                      |
| Matrícula em curso gratuito | `/checkout`                              | ✅       | acesso liberado na hora          |
| Pagamento de curso pago     | `/checkout`                              | ✅       | simulador em desenvolvimento     |
| Resultado do pagamento      | `/checkout/success`, `/checkout/pending` | ✅       |                                  |

## Aluno

| Funcionalidade                                                   | Rota                             | Situação | Observação                                                                           |
| ---------------------------------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| Painel                                                           | `/student`                       | ✅       |                                                                                      |
| Meus cursos e progresso                                          | `/student/courses`               | ✅       |                                                                                      |
| Player: vídeo, texto e arquivo                                   | `/student/courses/[slug]/player` | ✅       | percentual calculado no servidor                                                     |
| Marcar aula como concluída                                       | player                           | ✅       | conclusão do curso emite o certificado                                               |
| Vídeo do YouTube e do Vimeo                                      | player                           | ✅       | grava o progresso, retoma de onde parou, conclui aos 90% e avisa se o vídeo não abre |
| Quiz (nota mínima, retentativa)                                  | player                           | ✅       | gabarito só depois de responder                                                      |
| Anotações por aula                                               | `/student/notes`                 | ✅       |                                                                                      |
| Perguntas do curso                                               | `/student/questions`             | ✅       | o produtor responde                                                                  |
| Avaliar o curso                                                  | player                           | ✅       | só quem concluiu                                                                     |
| Certificados (listar e baixar PDF)                               | `/student/certificates`          | ✅       |                                                                                      |
| Financeiro (compras, comprovante)                                | `/student/financials`            | ✅       |                                                                                      |
| Pedir reembolso                                                  | `/student/financials`            | ⚠️       | API pronta; botão não está montado                                                   |
| Perfil (nome, avatar, senha, preferências)                       | `/student/profile`               | ✅       |                                                                                      |
| Suporte: abrir ticket e conversar em tempo real                  | `/student/support`               | ✅       |                                                                                      |
| Notificações                                                     | `/notifications`                 | ✅       | página e sino no cabeçalho, com aviso em tempo real                                  |
| Gamificação: pontos, nível, sequência, medalhas e ranking do mês | `/student/conquistas`            | ✅       | card no painel; engajamento no Analytics do produtor                                 |

## Produtor

| Funcionalidade                                                     | Rota                                 | Situação | Observação                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| Painel (receita, alunos, avaliações)                               | `/producer`                          | ✅       |                                                                                                |
| Criar curso (5 passos: dados, conteúdo, currículo, preço, revisão) | `/producer/courses/new`              | ✅       |                                                                                                |
| Editar, enviar para revisão e excluir curso                        | `/producer/courses`                  | ✅       | o card mostra o motivo da rejeição ou o pedido de alterações                                   |
| Enviar imagem do curso e arquivo de aula                           | `/producer/courses/new`              | ✅       |                                                                                                |
| Responder perguntas e avaliações                                   | `/producer/qna`, `/producer/reviews` | ✅       |                                                                                                |
| Financeiro e saques                                                | `/producer/financials`               | ✅       | saldo calculado com trava                                                                      |
| Academia (conteúdo de formação)                                    | `/producer/academy`                  | ✅       |                                                                                                |
| Perfil público                                                     | `/producer/profile`                  | ✅       |                                                                                                |
| Analytics                                                          | `/producer/analytics`                | ✅       | alunos, conclusão, funil, origem real das vendas e desempenho por curso, com filtro de período |

## Afiliado

| Funcionalidade                                 | Rota                    | Situação | Observação                   |
| ---------------------------------------------- | ----------------------- | -------- | ---------------------------- |
| Candidatura e aprovação                        | `/minha-conta/afiliado` | ✅       |                              |
| Links rastreáveis e clique capturado (`?aff=`) | `/affiliate`            | ✅       | atribuição por último clique |
| Painel, comissões e saque                      | `/affiliate`            | ✅       | saque só na API              |

## Administrador

| Funcionalidade                                  | Rota                                             | Situação | Observação                                             |
| ----------------------------------------------- | ------------------------------------------------ | -------- | ------------------------------------------------------ |
| Painel geral                                    | `/admin`                                         | ✅       |                                                        |
| Usuários: criar, editar, papéis, suspender      | `/admin/users`                                   | ✅       | protege o último admin                                 |
| Cursos: aprovar, rejeitar, mover para rascunho  | `/admin/courses`                                 | ✅       |                                                        |
| Cursos: pedir alterações ao produtor            | `/admin/courses`                                 | ✅       |                                                        |
| Cursos: arquivar                                | `/admin/courses`                                 | ✅       | sai do catálogo e há a aba Arquivados                  |
| Cursos: criar, editar e matricular aluno        | `/admin/courses/new`, `/admin/courses/[id]/edit` | ✅       |                                                        |
| Categorias                                      | `/admin/categories`                              | ✅       | hierarquia e ordem                                     |
| Cupons                                          | `/admin/coupons`                                 | ✅       |                                                        |
| Certificados: modelos e construtor              | `/admin/certificates`                            | ✅       | versões e prévia                                       |
| Certificados: ligar modelo a um curso           | `/admin/certificates`                            | ✅       | tabela de cursos com o template de cada um             |
| Certificados: emitir manualmente e revogar      | `/admin/certificates`                            | ✅       | emissão manual por curso e aluno, revogação com motivo |
| Blog                                            | `/admin/blog`                                    | ✅       | editor rico com HTML sanitizado                        |
| Banners e vitrines                              | `/admin/content`                                 | ✅       | a home exibe e conta os cliques                        |
| Configurações (geral, marca, financeiro, legal) | `/admin/settings`                                | ✅       |                                                        |
| Suporte: central de tickets                     | `/admin/support`                                 | ✅       |                                                        |
| Financeiro: métricas e saques                   | `/admin/finance`                                 | ✅       |                                                        |
| Produtores: candidaturas e contatos             | `/admin/producer-leads`                          | ✅       | aprovar concede o papel                                |
| Afiliados: candidaturas e parcerias             | `/admin/affiliates`                              | ✅       |                                                        |

## Qualidade transversal

| Requisito                                                                        | Situação | Observação                                                           |
| -------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| Acessibilidade WCAG 2.1 A e AA (axe-core), tema escuro e claro, todas as áreas   | ✅       |                                                                      |
| Uso só com teclado: login, menu, janelas (foco volta ao botão), seletores e quiz | ✅       |                                                                      |
| Páginas públicas sem recurso quebrado (404/500)                                  | ✅       |                                                                      |
| Celular (375 px): sem rolagem horizontal                                         | ✅       |                                                                      |
| Velocidade das páginas públicas (build de produção, celular)                     | ✅       | medido em localhost com a base do seed (~20 ms, ~200 ms, 0, ~190 KB) |

## Como atualizar

Ao criar ou corrigir uma funcionalidade, atualize a linha.
