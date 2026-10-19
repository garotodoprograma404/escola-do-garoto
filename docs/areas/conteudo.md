# Conteúdo: configurações, categorias, banners, vitrines e blog

Quatro módulos da API que alimentam o site público e o painel do admin.

| Área                        | API (`apps/api/src/modules/…`) | Front (`apps/web/src/…`)                                                                              |
| --------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Configurações da plataforma | `settings`                     | `features/admin/settings/**`                                                                          |
| Categorias                  | `categories`                   | `features/admin/categories/**`                                                                        |
| Banners e vitrines          | `content`                      | `features/admin/content/**`, `features/public/home/services/bannerService.ts`, `DynamicShowcases.tsx` |
| Blog                        | `blog`                         | `features/admin/blog/**`, `features/public/blog/**`, `app/(preview)/preview/blog/**`                  |

## Rotas (prefixo `/api`)

- **Configurações:** `GET /public/settings` (todos os grupos) e `GET /public/settings/:group`
  (`general`, `branding`, `financial`, `legal`; só chaves `is_public`, cache de 15 s no servidor e
  `s-maxage=60` pelo middleware de `/api/public`); `GET|PUT /admin/settings/:group` (admin).
- **Categorias:** `GET /public/categories` (ativas); `GET|POST /admin/categories`,
  `GET|PUT|DELETE /admin/categories/:id`, `GET :id/dependencies`, `POST :id/toggle-status`,
  `:id/toggle-featured`, `:id/move`.
- **Banners:** `GET /public/banners?position=`; `POST /banners/track-view` e `/banners/track-click`
  (body `{ bannerId }`, públicos, com limite por IP); `GET|POST /admin/banners`, `PUT|DELETE
/admin/banners/:id`, `POST :id/move`, `GET active-count`.
- **Vitrines:** `GET /public/showcases`, `GET /public/showcases/courses` (cada vitrine com seus
  cursos, uma chamada só); `GET|POST /admin/showcases`, `PUT|DELETE :id`, `POST :id/move`,
  `GET /admin/showcases/courses?search=` e `/courses/by-ids?ids=1,2` (seletor de cursos).
- **Blog público:** `GET /public/blog/posts`, `/featured`, `/posts/:slug`, `/posts/:id/related`,
  `POST /public/blog/posts/:id/views`. **Curtidas (login):** `GET /blog/posts/:id/like-status`,
  `POST /blog/posts/:id/like` (liga/desliga). Na página do post, o botão (`LikeButton`) chama a API
  direto do navegador; visitante sem login é levado a `/login?redirect=` e volta ao post.
- **Blog admin:** `GET|POST /admin/blog/posts`, `GET|PUT|DELETE /admin/blog/posts/:id`,
  `POST :id/publish|unpublish|archive`, `GET posts/by-slug/:slug` (pré-visualização),
  `GET /admin/blog/stats`, `GET /admin/blog/categories`.

A home (`/`) mostra o carrossel dos banners ativos de posição `hero`; sem nenhum, mostra a apresentação padrão
(nome e descrição das configurações, botões "Ver cursos" e "Ensinar"). As vitrines ativas aparecem abaixo
dos cursos em destaque. Salvar banner ou vitrine invalida o cache da home. O clique no banner é contado pelo
navegador direto na API.

Formato: respostas de entidades em `snake_case`, para o front manter os mapeamentos; corpos de entrada em
`camelCase`, como os formulários montam. As configurações saem agrupadas em objetos `camelCase`
(`GeneralSettings` etc.).

Upload de logo e favicon: tipo `branding` em `modules/files/file-types.ts` (só admin; PNG, JPG, WEBP, SVG,
ICO; 5 MB). Banners e imagem de destaque do blog usam `banner-desktop`, `banner-mobile` e `blog_featured`.

## Regras de negócio

- **Blog:** só o **admin** escreve. Publicar um post já publicado não muda a data de publicação. Um post
  publicado só aparece quando `published_at <= agora`. A busca pública do blog procura em título e
  resumo. As listas não trazem `content`, e a API pública não devolve o `author_id`.
- **Ordenação** (categorias, banners, vitrines): reordenar regrava a ordem 0..n-1 entre as irmãs, o que
  funciona mesmo quando várias têm o mesmo `display_order`. Banner e vitrine novos entram no fim da lista.
- **Configurações:** só as seções geral, marca, financeiro e legal existem na tela.
- **Banners:** no máximo 5 ativos ao mesmo tempo; o limite só vale ao **ligar** um banner desligado. O
  banner público não traz `total_clicks`.
- **Vitrine dinâmica:** guarda a regra e o `limit`; o admin lê a regra de verdade.
- **Links e imagens** de banner e blog aceitam rota interna (`/algo`) ou URL absoluta http/https.
- **Cache das configurações:** quase toda página lê nome, logo, cores e textos legais. O front mantém
  `unstable_cache` de 5 min com tag (`general-settings`, `branding-settings`, `legal-settings`,
  `financial-settings`), invalidada com `revalidateTag` depois de salvar. A API tem mais 15 s de memória
  própria (invalidada ao salvar) e `s-maxage=60`. Se a API cair, as páginas seguem com os valores padrão.
- **Auditoria:** toda escrita de admin (configurações, categorias, banners, vitrines, blog) grava em
  `admin_audit_log` com usuário, IP validado e navegador.

## Proteções

- **Só o admin escreve no blog.** `create`, `update`, `delete`, `publish`, `unpublish`, `archive` e a
  leitura de rascunhos são `@Roles(['admin'])`; o autor vem da sessão, nunca do cliente. Um aluno logado
  não cria, edita, publica nem apaga posts, e não lê rascunhos.
- **XSS armazenado no blog é barrado.** O HTML do editor rico é sanitizado no servidor ao gravar **e**
  ao ler (post público, admin e pré-visualização), por `common/html/sanitize-rich-html.ts`
  (`sanitize-html`): sem script, evento, `style`, iframe, formulário, `javascript:` ou `data:`. A mesma
  função serve para o HTML das aulas.
- **Categorias, banners, vitrines e configurações** exigem `@Roles(['admin'])` em todas as rotas de
  escrita **e** nas de leitura do admin.
- **O servidor decide as chaves de configuração.** O catálogo de chaves e a visibilidade (`is_public`)
  ficam em `settings.registry.ts`; o cliente não escolhe. Chave desconhecida é ignorada, cores aceitam só
  `#RRGGBB`, a fonte só caracteres seguros (ela vai para CSS) e logo e favicon só link seguro.
- **Links perigosos são recusados.** `z.url()` aceita `javascript:` e `data:`, então links de banner, de
  políticas legais, imagens de banner e blog e logo passam por `isSafeUrl` (rota interna `/x` ou
  http/https).
- **Busca sem injeção de filtro.** O termo vira parâmetro por `likeContains`, normalizado (NFKC) no banco
  antes de escapar `\ % _`.
- **Contadores de banner não são inflados à vontade.** `track-view` e `track-click` têm `@Throttle` por IP
  (60/min e 20/min), só contam banner que está no ar e não revelam se o id existe.
- **Visualização de post não é inflável.** Limite por IP (30/min), robôs ignorados, uma visualização por
  sessão (restrição única) e uma por IP a cada 24 h, só em post publicado. O `ViewTracker` chama a API
  direto do navegador para que o IP seja o do leitor (pela Server Action o IP seria o do Next).
- **Limite de 5 banners ativos sem corrida.** A checagem e o insert rodam numa transação com
  `pg_advisory_xact_lock`, testada com 8 requisições simultâneas.
- **Exclusão de categoria segura.** Subcategorias e cursos são conferidos na **mesma transação** do
  delete (com `FOR UPDATE` na linha), então uma subcategoria criada em paralelo não é apagada em cascata.
- **Uploads de SVG** (logo) são seguros porque a API serve os arquivos com `Content-Security-Policy:
sandbox` e `nosniff` (`files.controller.ts`); esses cabeçalhos não devem ser removidos.

## Limitações conhecidas

- Views e cliques de banner só têm limite por IP (60 e 20 por minuto), sem deduplicação: o CTR pode ser
  inflado por quem insistir. Dá para deduplicar por IP como no blog.
- O admin do blog lista até 500 posts por consulta (`limit` máximo) e pagina de 10 em 10.
- O gatilho de visualizações do blog recalcula `total_views` com `COUNT(*)` a cada visita; um incremento
  direto seria mais barato em posts muito acessados.
