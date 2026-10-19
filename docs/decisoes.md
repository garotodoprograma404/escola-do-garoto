# Decisões de arquitetura

Registro curto de cada decisão relevante: o que foi escolhido, por quê e o que ficou de fora.

## Schema com nomes em snake_case

Nomes de tabela e coluna em `snake_case`, ids `bigint` (identity) nas tabelas de catálogo e cursos e `uuid`
nas de pessoa, dinheiro em `numeric(10,2)` e datas em `timestamptz`. No TypeScript as colunas ficam em
camelCase (`casing: 'snake_case'` no Drizzle) e as respostas das rotas que alimentam as telas saem em
`snake_case`, o formato que os componentes consomem. Os serviços do front são chamadores finos da API.

## Back-end separado, em NestJS

Regra de negócio, autorização e acesso ao banco ficam na API; o Next cuida só de tela. Motivos: o mesmo
back-end serve qualquer cliente, a regra fica testável sem renderizar nada, e a superfície de segurança é
uma só (guards, validação e filtro por dono num lugar).

## Autorização no código, não no banco

A autorização é **guard + filtro por dono no service**, testada por rota (401 sem login, 403 com papel
errado, 404 para dado de outra pessoa). O banco não decide quem vê o quê: ele garante integridade (chaves
estrangeiras, `CHECK`, índices únicos e gatilhos), e a regra de acesso fica onde pode ser lida, revisada e
testada com o resto do código.

## Autenticação própria

- **Sessão com token opaco** guardado no banco (hash SHA-256) e enviado em cookie `HttpOnly; Secure;
SameSite=Lax`, não JWT: dá para revogar na hora (logout, troca de senha, suspensão).
- **Argon2id** pelo `node:crypto`, sem dependência nativa.
- **Cadastro com confirmação de e-mail**; link com o token no fragmento (`#`), que não vai para log.
- **Segurança por padrão:** guards globais exigem sessão em toda rota; `@Public()` libera;
  `@Roles()` restringe. Limite de tentativas por IP, por conta e por sessão.
- **CSRF:** checagem de `Origin`/`Sec-Fetch-Site` em toda requisição que altera dados.

Visão completa em [seguranca.md](seguranca.md).

## Banco com Drizzle ORM

SQL tipado, sem engine extra, schema em TypeScript. As migrations ficam em `apps/api/drizzle/`:
`0000_initial_schema.sql` e `0002_indexes_and_constraints.sql` são geradas pelo `drizzle-kit`;
`0001_triggers.sql` é escrita à mão (gatilhos de `updated_at`, contadores do blog e do suporte). A API
aplica as migrations ao subir.

## Dinheiro

O banco guarda `numeric(10,2)` em reais. Dentro dos serviços toda conta é feita em **centavos inteiros**, e
a conversão acontece só nas bordas. O servidor decide todos os valores: o cliente manda só ids e código de
cupom.

## Pagamento (Mercado Pago)

Checkout Pro por `fetch`, sem SDK. Webhook com assinatura HMAC obrigatória; a notificação só traz o
id, então o pagamento é **reconsultado** e conferido (moeda, valor e referência) antes de mudar o
pedido. Um único caminho muda o estado do pedido (`PaymentsService.applyPayment`), com trava de linha e
idempotência. As credenciais são cadastradas pelo admin no painel e guardadas
cifradas no banco (nada no `.env`); sem elas, desenvolvimento e demonstração usam um simulador que passa
pelas mesmas validações, e produção recusa pedidos pagos até alguém configurar. Detalhes em [areas/checkout.md](areas/checkout.md).

## Tempo real por SSE

Chat de suporte e notificações usam Server-Sent Events (cookie de sessão autentica, sem WebSocket).
Limite conhecido: o barramento e a presença ficam na memória, então roda **uma instância da API**.

## Arquivos

`FileStorage` é uma interface; hoje grava em disco (volume). Buckets `public` e `thumbnails` são
públicos; `documents` e `certificates` só saem por URL assinada com validade. Upload valida tipo, papel,
tamanho e a assinatura real do arquivo antes de gravar.

## Front: zod 3, API: zod 4

O front usa zod 3 e `@hookform/resolvers`; a API e `@vox/contracts` usam zod 4. Por isso o front
importa **só tipos** de `@vox/contracts`, nunca valores.

## Produção

Um servidor com Docker Compose: Caddy (HTTPS e IP real do cliente), front, API e Postgres
(`infra/producao/`, guia em [deploy.md](deploy.md)). A API recusa subir em produção com configuração
insegura (e-mail por console, simulador de pagamento, segredo ausente, limite de tentativas desligado).

## Ferramentas

pnpm workspaces sem Turborepo (poucos pacotes). Podman/Docker Compose para o Postgres local. Prettier,
ESLint (front), oxlint (API) e knip para manter o código sem sobra.

## Imagens de origem variável usam `<img>`

`next/image` só serve hosts cadastrados e não abre prévia local (`blob:`). Logo e capas vêm de URLs
que o admin ou o produtor informa (ou do arquivo que acabou de ser escolhido), então esses pontos usam
`<img>` com `eslint-disable-next-line @next/next/no-img-element` e `alt` descritivo. Imagens de
origem conhecida e fixa usam `next/image`.

## Efeitos que avisam o componente pai

Efeito que chama `onUpdate`/`onChange` do pai usa `useStableCallback` (`shared/hooks`): a função tem
identidade estável e chama sempre a versão atual. Assim o efeito só reexecuta quando o dado muda, sem
desligar `react-hooks/exhaustive-deps`.

## Cor da marca e contraste

O admin escolhe a cor primária (padrão: lima `#BFFF0A`). `shared/lib/color.ts` deriva dela, para cada
tema, a cor `--primary` e a cor do texto sobre ela: no tema claro a cor escurece até ler bem sobre
branco, no escuro ela clareia, e o texto é preto ou branco conforme o contraste (mínimo 4,5:1). Os
tokens `--brand-*` continuam com a cor exata da marca. Assim qualquer cor escolhida produz botões
legíveis; sem isso o padrão dava texto branco sobre lima no tema claro.

## Janelas devolvem o foco

O Radix só devolve o foco ao botão quando a janela abre por `<DialogTrigger>`. Quase todas aqui abrem
por estado, então `useReturnFocus` (`shared/hooks`) lembra quem tinha o foco ao abrir e o devolve ao
fechar, em `Dialog`, `AlertDialog` e `Sheet`.

## Desempenho, sem cache por enquanto

Medido com dezenas de milhares de registros: a busca usa índices trigram (`pg_trgm`, migrations 0004 e
0005), a lista de usuários pagina antes de calcular papel/status e as métricas de cursos agrupam no SQL. O
Postgres sobe com `random_page_cost=1.1` e `jit=off`. Cache de dados fica de fora até o uso real pedir: os
números não justificam o risco de preço e vaga desatualizados.

## Ambiente de demonstração (`DEMO_MODE`)

Para mostrar o sistema funcionando sem Mercado Pago nem SMTP configurados. Em
produção a API exige Mercado Pago e SMTP; `DEMO_MODE=true` libera só o simulador de pagamento e o e-mail
no log (com a conta nova já confirmada), e obriga o simulador (nunca cobra de verdade com o modo ligado).
As demais travas de produção continuam. O seed roda em produção só nesse modo, com senhas fortes vindas
do ambiente. Receita em `infra/demo/` (atrás do Traefik do Coolify, aberto ao público).

## Conteúdo da demonstração pelos serviços da API

`seed-demo` sobe o contexto Nest e usa os mesmos serviços das telas (criar curso, aprovar, comprar,
pagar pelo simulador, concluir aula, quiz, avaliar, emitir certificado). Assim pedidos, comissões,
contadores e certificados ficam coerentes como em uso real; só as datas são deslocadas no SQL depois,
para espalhar a atividade. O certificado em PDF passou a sair com acentos (WinAnsiEncoding) e os
números públicos do instrutor (alunos, cursos e nota) passaram a ser calculados dos cursos publicados.

## Gamificação por eventos, sem acoplar ao estudo

Pontos, nível, sequência e medalhas nascem dos avisos do módulo `learning` (`LearningActivityService` e
`CourseCompletionService`), emitidos depois do commit: o estudo não conhece a gamificação, e falha nela
nunca desfaz uma aula concluída. Cada ponto é uma linha em `xp_events` com chave única por fato (nada
pontua duas vezes) e as regras ficam em código (`gamification.rules.ts`), não no banco. Ranking por curso
e por mês (zera todo mês) com primeiro nome e inicial, e opção de sair dele.

## Mercado Pago configurado pelo painel, não pelo `.env`

Quem sobe a plataforma não precisa mexer em variável de pagamento: o admin cola o Access Token e a
assinatura do webhook em Configurações → Financeiro, o sistema confere o token no Mercado Pago e guarda os
dois cifrados (AES-256-GCM) com uma chave derivada do `FILES_SIGNING_SECRET`, que a produção já exige.
Sem credenciais, a API sobe do mesmo jeito: o checkout pago fica desligado com aviso claro. Os segredos
nunca voltam para a tela nem para o log de auditoria.

Ainda não conferido com uma conta real do Mercado Pago de ponta a ponta (a conferência do token no
painel já fala com a API do Mercado Pago).

## Reembolso aprovado no painel, estorno pelo próprio pagamento

O admin aprova ou recusa o pedido do aluno na aba Reembolsos do Financeiro. Aprovar pede o estorno total
ao Mercado Pago pela API (com chave de idempotência por pedido de reembolso), mas **não mexe no pedido**:
quem tira o acesso, revoga o certificado e desconta produtor e afiliado é o pagamento estornado, pelo mesmo
`applyPayment` do webhook. Assim existe um caminho só para estorno (pelo painel da plataforma, pelo painel
do Mercado Pago ou por chargeback). O prazo para pedir é de **7 dias**, igual à política de reembolso
publicada e ao direito de arrependimento (CDC, art. 49). Estorno parcial fica de fora.
