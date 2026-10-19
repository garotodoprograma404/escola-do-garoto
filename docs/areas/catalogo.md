# Catálogo público

Vitrine pública do sistema: listagem e filtros de cursos, detalhe do curso, avaliações, cursos
relacionados, perfil público do instrutor, home, busca global (com histórico) e preços atuais dos
cursos do carrinho. Tudo sob `apps/api/src/modules/catalog/`.

## Arquivos da API

| Arquivo                        | Papel                                                                 |
| ------------------------------ | --------------------------------------------------------------------- |
| `public-catalog.controller.ts` | rotas `@Public()` sob `/api/public/...` (só HTTP)                     |
| `search-history.controller.ts` | `/api/search/history` (exige login; dono sempre vindo da sessão)      |
| `catalog.service.ts`           | listagem/filtros/ordenação, categorias do filtro, preços do carrinho  |
| `course-detail.service.ts`     | detalhe, avaliações, distribuição de notas, relacionados              |
| `instructors.service.ts`       | perfil público do instrutor                                           |
| `home.service.ts`              | contadores do hero, cursos em destaque, categorias populares          |
| `search.service.ts`            | busca (cursos, instrutores, posts), contagens, sugestões, histórico   |
| `catalog.schemas.ts`           | zod de entrada (query/params/body)                                    |
| `catalog.helpers.ts`           | funções puras (escape de LIKE, preço atual, conteúdo público da aula) |
| `producers.lookup.ts`          | nome/avatar dos produtores só dos cursos da página                    |

## Rotas

| Rota                                                             | O que devolve                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `GET /api/public/catalog/courses`                                | listagem paginada com filtros e ordenação                      |
| `GET /api/public/catalog/categories`                             | categorias do filtro                                           |
| `GET /api/public/catalog/courses/:slug`                          | detalhe do curso, currículo e instrutor                        |
| `GET /api/public/catalog/courses/:id/reviews`                    | avaliações do curso                                            |
| `GET /api/public/catalog/courses/:id/reviews/stats`              | nota média e distribuição de notas                             |
| `GET /api/public/catalog/courses/:id/related`                    | cursos relacionados                                            |
| `GET /api/public/instructors/:slug`                              | perfil público do instrutor e seus cursos                      |
| `GET /api/public/home/hero-stats`                                | contadores do topo da home                                     |
| `GET /api/public/home/featured-courses`                          | cursos em destaque                                             |
| `GET /api/public/home/popular-categories`                        | categorias populares                                           |
| `GET /api/public/cart/items?ids=1,2`                             | preço e disponibilidade atuais dos cursos do carrinho          |
| `GET /api/public/search`, `/search/stats`, `/search/suggestions` | busca global, contagens e sugestões                            |
| `GET/POST /api/search/history` (login)                           | histórico de busca da pessoa logada (até 100 itens por pessoa) |

As respostas usam campos em `snake_case`, o formato que os componentes do front consomem.

## Front (`apps/web/src`)

Os services são chamadores finos da API (`apiServer`):
`features/public/catalog/services/catalogService.ts`,
`features/public/course-detail/services/courseDetailService.ts`,
`features/public/instructor-profile/services/instructorProfileService.ts`,
`features/public/home/services/homeService.ts` (usa `unstable_cache` via
`features/public/catalog/lib/public-api.ts`, que chama a API **sem cookie**, porque `cookies()` não pode
ser lido dentro de cache) e `features/search/services/searchService.ts`. O carrinho usa
`features/public/cart/services/cartService.ts` e `actions/apply-coupon.ts`.

## Regras de negócio

- Só entram na vitrine cursos **aprovados e publicados**. Curso inexistente e curso não publicado
  respondem com o mesmo 404.
- Currículo público: só módulos e aulas **publicados**. O conteúdo (`content_url`, `content_text`) vem
  apenas nas aulas de **prévia grátis** (`is_free_preview`); nas demais as chaves existem com `null`.
- Instrutor só aparece com perfil ativo, `public_profile_enabled` ligado e ao menos um curso publicado.
  O `slug` do instrutor só é entregue no detalhe do curso se o perfil público estiver ligado.
- Busca global: cursos aprovados e publicados; posts do blog publicados com `published_at <= now()`
  (a imagem vem de `featured_image_url`); instrutores com curso publicado.
- `total_students` vem de `courses.total_students`, como na home e no detalhe.
- Ordenar por "melhor avaliados" põe os cursos sem nota no fim.
- Home: "em destaque" são os publicados mais recentes; "popular" é a ordenação por mais novos.
  Categoria inexistente no filtro não filtra.
- Cartões de curso (catálogo, home, busca) trazem só os primeiros 500 caracteres da descrição.
- O `slug` do detalhe é validado (`[a-zA-Z0-9_-]`); outro formato responde 400 e o front mostra 404.
- Contadores do curso (`total_students`, `total_reviews`, `average_rating`, `total_lessons`,
  `total_duration_minutes`) são colunas denormalizadas, mantidas por quem escreve matrícula, avaliação e
  aula. O detalhe cai para a contagem real quando elas estão zeradas; catálogo e home usam a coluna.

## Proteções

- **Conteúdo de aula paga não vaza.** A vitrine devolve só a estrutura do currículo; vídeo e texto de
  aula paga nunca saem nas rotas públicas, e o gabarito de quiz nunca é consultado nesta área. Ver o
  DevTools não dá acesso ao curso sem pagar.
- **Busca sem injeção de filtro.** Todo termo vira parâmetro SQL, com `%`, `_` e `\` escapados
  (`ILIKE ... ESCAPE '\'`); um `%` digitado não vira curinga e vírgula ou parêntese não alteram a
  consulta.
- **Curso não público não é acessível por id.** Avaliações, estatísticas e relacionados só existem para
  curso aprovado e publicado, e a resposta é igual para "não existe" e "não publicado".
- **Perfil de instrutor sem dados pessoais.** O `select` é explícito: nada de CPF, telefone, endereço,
  comissão ou faturamento.
- **Custo proporcional à página.** Home e hero usam agregações no banco; a listagem busca aulas e
  produtores só dos cursos da página; há limites máximos (`limit` até 48, `page` até 10000, termo de
  busca até 100 caracteres, carrinho até 50 ids); a busca tem limite de 30 requisições por minuto por IP
  (`@Throttle`) e o histórico é limitado a 100 itens por pessoa.
- **Preço nunca vem do cliente.** O carrinho é um cookie que o navegador edita, então o preço e o
  "aceita cupom" são lidos do banco (`/public/cart/items`); a página do carrinho se atualiza com o preço
  atual e remove curso que saiu do ar. O checkout recalcula tudo no servidor (ver
  [checkout.md](checkout.md)).
- **Histórico de busca isolado.** O dono vem sempre da sessão; qualquer `userId` enviado pelo cliente é
  ignorado.

## Limitações conhecidas

- As rotas públicas não enviam `Cache-Control`; o Next controla o cache da home. Se a API ficar atrás de
  CDN, vale adicionar um `Cache-Control` curto nas rotas de listagem.
- A busca usa `ILIKE`; busca por trigramas (`pg_trgm`/`unaccent`) seria uma melhoria de desempenho.
