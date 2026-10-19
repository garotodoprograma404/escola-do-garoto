# Segurança

Visão consolidada das proteções do sistema. Para relatar uma vulnerabilidade, veja
[`SECURITY.md`](../SECURITY.md). O checklist aplicado a cada rota da API está no fim deste documento, e as
proteções específicas de cada área estão em [`docs/areas/`](areas/README.md).

## Princípios

- **Seguro por padrão.** Toda rota da API exige sessão; rota pública é marcada com `@Public()` e rota
  restrita com `@Roles(...)`. Config de segurança nunca depende de "adivinhar o ambiente": é variável
  explícita no schema de `apps/api/src/config/env.ts`, com trava em produção.
- **O servidor decide.** Autorização, preço, desconto, progresso e papel são calculados e conferidos na API.
  O front nunca acessa o banco e o cliente manda só identificadores e dados de entrada.
- **Resposta mínima.** Todo `select` é explícito: a resposta não vaza hash de senha, token, e-mail ou dado
  de outro usuário.

## Autenticação e sessão

- Cadastro com **confirmação de e-mail** (link válido por 24 h, reenvio com intervalo mínimo de 1 min por
  conta). O token vai no fragmento `#` da URL, que não chega a logs de servidor.
- Login por **sessão com token opaco**: só o hash SHA-256 fica no banco e o token vai em cookie
  `HttpOnly; SameSite=Lax` (e `Secure` quando o site é https). Validade fixa de 30 dias, sem renovação
  silenciosa. Como a sessão fica no banco, logout, troca de senha e suspensão da conta a revogam na hora.
- Senha com **Argon2id** (implementação do `node:crypto`; 19 MiB, 2 passadas, paralelismo 1), gravada no
  formato PHC para permitir endurecer os parâmetros depois.
- Recuperação de senha com link válido por 1 h e intervalo mínimo de 1 min entre e-mails para
  a mesma conta (anti e-mail-bomb). Trocar a senha encerra as outras sessões e invalida os links pendentes.
- Respostas de `/api/auth/*` saem com `Cache-Control: no-store`.
- Suspender uma conta apaga as sessões na hora e fecha os streams de tempo real abertos em até 30 s. O
  último admin ativo nunca pode ser suspenso, desativado ou rebaixado.

## Autorização por papel e por dono

- Papéis: `student`, `producer`, `affiliate`, `admin` (um usuário pode ter vários). Guards globais, nesta
  ordem: limite de tentativas, sessão, papel.
- Recurso de uma pessoa (matrícula, nota, pedido, saque, ticket, notificação) é filtrado pelo `userId` da
  **sessão** dentro do service, nunca pelo id que veio no body, na query ou na URL. Recurso de outra pessoa
  responde 404, igual a "não existe".
- Trocar de papel revoga o anterior (`revoked_at`, `revoked_by`) e nunca apaga histórico.
- Toda escrita de admin relevante grava em `admin_audit_log` (usuário, IP validado, navegador). Senha e hash
  nunca entram no registro.
- A autorização vive no código (guard + filtro por dono), não em políticas do banco; cada rota responde 401
  sem login, 403 com papel errado e só mostra o que é do dono.

## Validação de entrada

- Todo body, query e param passa por `ZodValidationPipe` antes de chegar ao service. O corpo JSON tem
  limite de 1 MB e a API não lê formulários (`bodyParser: false`), o que fecha o único formato que um
  `<form>` de outro site conseguiria enviar sem preflight.
- SQL só parametrizado (template `sql` do Drizzle). Buscas usam `likeContains`: o termo é normalizado (NFKC)
  no banco antes de escapar `\ % _`, então curinga de largura total não vaza e `%` digitado não vira
  curinga.
- Links e destinos vindos do usuário (banner, políticas legais, logo, redes sociais, `?redirect=`) passam
  por `isSafeUrl` na API e por `safeRedirect` no front: rota interna ou http/https, nunca `javascript:` ou
  `data:`.
- Dinheiro: centavos inteiros em todo o código; nunca `float` nem `parseFloat` em valor vindo de fora. O
  cliente nunca manda preço, desconto, taxa nem total.

## Upload e arquivos

- Tipos de upload fixos (`modules/files/file-types.ts`), cada um com bucket, pasta, tamanho máximo, formatos
  e papéis permitidos. A extensão vem do tipo, nunca do nome que o cliente mandou; imagens e PDF têm a assinatura
  dos bytes conferida.
- Buckets `public` e `thumbnails` são públicos; `documents` e `certificates` só saem por URL assinada com
  validade curta (HMAC com `FILES_SIGNING_SECRET`).
- Arquivos são servidos com `Content-Type` pela extensão, `X-Content-Type-Options: nosniff` e
  `Content-Security-Policy: default-src 'none'; sandbox`; por isso um SVG enviado não executa script.
  Esses cabeçalhos não devem ser removidos.
- Avatar só aceita arquivo enviado pela própria pessoa. O download de certificado confere dono ou admin a
  cada clique e entrega um link de 60 s.

## Pagamento e webhook

- O webhook do Mercado Pago exige assinatura HMAC (`x-signature`), comparada em tempo constante. A
  notificação só traz o id: o pagamento é **reconsultado** no gateway e conferido (moeda, valor e
  referência) antes de mudar o pedido.
- Um único caminho altera o estado do pedido (`PaymentsService.applyPayment`), com trava de linha
  (`FOR UPDATE`), máquina de estados pura e idempotência por chave do evento.
- Cupom reservado por atualização atômica, devolvido quando o pedido expira ou é cancelado; ordem de travas
  fixa (cupom antes do pedido) para evitar deadlock.
- Erros do gateway nunca incluem token, corpo da resposta nem dado do pagador em mensagem, log ou evento.
- O simulador de pagamento (`PAYMENT_DRIVER=fake`) é proibido em produção pelo `env.ts`.

Detalhes em [areas/checkout.md](areas/checkout.md).

## XSS e HTML

- HTML do editor rico (blog e aulas) é sanitizado no servidor ao gravar **e** ao ler
  (`common/html/sanitize-rich-html.ts`, `sanitize-html`): sem script, evento, `style`, iframe, formulário,
  `javascript:` ou `data:`.
- Comprovantes e relatórios escapam todo texto; o comprovante é servido com CSP restritiva, `nosniff` e
  `attachment`; o CSV neutraliza fórmulas (`=`, `+`, `-`, `@`).
- O Helmet está ativo na API.

## Limite de tentativas

- Guard global `AppThrottlerGuard`: limite por IP (padrão de 120 requisições por minuto), limite **por
  conta** (o e-mail do corpo, normalizado) e limite **por sessão**. As rotas sensíveis têm limites próprios
  por IP: login 10/min, cadastro 5/min, "esqueci a senha" 3/min, confirmação de e-mail 10/min, reenvio de
  confirmação 3/min e redefinição 5/min. Rotas públicas que gastam CPU ou aceitam entrada anônima (busca,
  contadores de banner, verificação de certificado, cliques de afiliado, contatos de produtor) têm `@Throttle`
  próprio.
- IPv6 é agrupado por /64, para que uma única casa não tenha 2^64 baldes de limite.
- `RATE_LIMIT_ENABLED` não pode ser desligado em produção.
- O servidor do Next chama a API com `x-internal-key` (`INTERNAL_API_KEY`, nunca com `NEXT_PUBLIC_`); essas
  chamadas pulam o limite por IP da conexão, porque todas as páginas chegariam de um IP só. Em vez dele vale
  o limite **por visitante**: o Next repassa o IP de quem navega (`x-vox-client-ip`, tirado do
  `X-Forwarded-For` do proxy) e a API só aceita esse cabeçalho junto com a chave interna. Login, cadastro e
  recuperação de senha pelo site têm os mesmos números do limite por IP; o resto, um teto alto (600/min).
- O limite **por conta** (e-mail) e o **por sessão** valem sempre, inclusive nas chamadas do Next. A troca
  de senha (aluno, produtor e admin) tem 5 tentativas por minuto por sessão.

## CSRF

Além do cookie `SameSite=Lax`, o middleware `OriginCheckMiddleware` exige, em toda requisição que altera
dados (qualquer método diferente de GET, HEAD e OPTIONS), `Origin` igual a `WEB_ORIGIN` e recusa
`Sec-Fetch-Site: cross-site`. Chamadas servidor a servidor, que não carregam cookie automaticamente, passam.

## IP real e proxy

Nunca se usa `req.ip` cru nem `X-Forwarded-For`: o IP vem de `clientIp()`, que valida o formato e cai para o
endereço da conexão quando o cabeçalho é lixo. Em produção o IP só é confiável atrás do proxy reverso de
`infra/producao/Caddyfile`, que sobrescreve o cabeçalho com o IP real, e a lista de proxies confiáveis é
`TRUSTED_PROXIES`. Não coloque o rewrite do Next entre o usuário e a API em produção, pois ele repassa o
cabeçalho que o cliente mandou. O IP validado é o registrado na auditoria.

## E-mail com TLS

Com `MAIL_DRIVER=smtp`, o envio exige TLS: `SMTP_SECURE=true` (TLS direto) ou `SMTP_REQUIRE_TLS=true`
(STARTTLS obrigatório). Em produção a API **não sobe** com `MAIL_DRIVER=console` (ninguém receberia o link de
confirmação) nem com SMTP sem TLS.

## Configuração insegura não sobe

Em produção a API recusa iniciar sem: `WEB_ORIGIN` https, `INTERNAL_API_KEY`, `FILES_SIGNING_SECRET`,
`PAYMENT_DRIVER=mercadopago` com token, chave do webhook e `API_PUBLIC_URL` https, limite de tentativas
ligado e e-mail por SMTP com TLS. `NODE_ENV` é obrigatório (sem padrão), porque liga essas travas.

## Limitações conhecidas

- Tempo real (chat e notificações), presença e alguns contadores de tentativas ficam na memória de uma
  única instância da API.
- O limite por visitante nas chamadas do Next depende do proxy da frente definir o `X-Forwarded-For` (Caddy
  e Traefik fazem isso); sem proxy não há IP repassado e esse limite não se aplica.
- As limitações específicas de cada área estão listadas no fim do respectivo documento em
  [`docs/areas/`](areas/README.md).

## Checklist de cada rota da API

Antes de considerar uma rota pronta:

- [ ] Sem `@Public()`, exige sessão. Se tem `@Public()`, é porque precisa mesmo ser aberta.
- [ ] Ações de admin/produtor/afiliado têm `@Roles(...)`.
- [ ] Recurso de um usuário (matrícula, nota, pedido, saque) é filtrado pelo `userId` da sessão
      no service, e nunca pelo id que veio no body/query.
- [ ] Body, query e params passam por `ZodValidationPipe`.
- [ ] `select` explícito: a resposta não vaza hash de senha, token, e-mail ou dados de outro usuário.
- [ ] Escrita em várias tabelas dentro de `db.transaction`.
- [ ] Webhook externo (Mercado Pago) valida assinatura e é idempotente (não processa o mesmo evento 2x).
- [ ] SQL cru só com o template `sql\`...\`` do Drizzle (parametrizado), nunca concatenando string.
- [ ] Limite de tentativas (`@Throttle`) em rota pública que gasta CPU (hash), envia e-mail ou
      aceita credencial; cuidar do limite **por conta**, não só por IP.
- [ ] Nunca confiar em `req.ip` cru nem em `X-Forwarded-For`: use `clientIp()` (valida IP). Em
      produção o IP só é confiável atrás do proxy reverso de `infra/producao/Caddyfile` (e `TRUSTED_PROXIES`).
- [ ] Token que vai em link (e-mail) vai no fragmento `#`, nunca em query string.
- [ ] `?redirect=` e qualquer destino vindo do usuário passa por `safeRedirect` (front).
- [ ] Config de segurança nunca depende de "adivinhar o ambiente": use variável explícita no
      schema de `config/env.ts`, com trava em produção.
- [ ] Endpoint público (`@Public()`): sem `select *`, só colunas escolhidas; consulta cara (agregação,
      busca) precisa ser proporcional à PÁGINA devolvida, não à tabela inteira.
- [ ] Servidor do Next chama a API com `x-internal-key` (`INTERNAL_API_KEY`): nunca exponha essa chave
      ao navegador (sem `NEXT_PUBLIC_`).
- [ ] LIKE/busca: normalizar no banco antes de escapar `\ % _` (letras de largura total viram curinga).
- [ ] Dinheiro: centavos inteiros em todo o código; reais decimais só na fronteira do gateway, via
      `money.ts` (módulo `checkout`). Nunca `parseFloat`/`Number('')` em valor vindo de fora.
- [ ] Cliente nunca manda preço, desconto, taxa nem total: só ids e código de cupom.
- [ ] Webhook: assinatura obrigatória, id validado antes de virar URL, corpo NÃO manda no pedido
      (reconsulta o pagamento), confere moeda + valor + referência, tudo por `applyPayment`.
- [ ] Mudança de estado de pedido: lock da linha (`FOR UPDATE`), máquina de estados pura, idempotente.
- [ ] Contador/limite sob concorrência (cupom, estoque): trava a linha e testa com requisições simultâneas.
- [ ] Erro do gateway: nunca incluir token, corpo da resposta nem dado do pagador em mensagem/log/evento.
