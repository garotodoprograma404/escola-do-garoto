# Changelog

Todas as mudanças relevantes do projeto ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [1.0.0] - 2026-10-19

### Adicionado

- Área pública: catálogo com filtros, busca, página do curso com prévia grátis, perfil do instrutor, blog e
  verificação de certificado pelo código.
- Compra com carrinho, cupom e Mercado Pago (Pix e cartão); curso grátis com matrícula na hora.
- Aluno: player com vídeo, texto, PDF, YouTube e Vimeo, progresso calculado no servidor, quiz com nota
  mínima, anotações, perguntas, avaliação e certificado em PDF.
- Gamificação: pontos, níveis, sequência de dias, 11 medalhas e ranking do mês por curso.
- Produtor: criação de curso em cinco passos, perguntas e avaliações, Analytics com engajamento, financeiro
  e saque.
- Afiliado: links rastreáveis, cliques, comissões e saque.
- Admin: aprovação de cursos, usuários, categorias, cupons, blog, banners, construtor de certificados,
  suporte em tempo real, financeiro e configurações de marca (nome, cores e logo).
- Modo de demonstração: entrada com um clique como aluno, produtor ou admin, compra simulada e conteúdo de
  exemplo com as aulas do canal Garoto do Programa;.
- Receitas de implantação com Docker Compose e Caddy, ou atrás do Traefik do Coolify.

### Segurança

- Sessão por cookie `HttpOnly`, senha com Argon2id, proteção contra CSRF e limite de tentativas por IP,
  conta e sessão.
- Preço sempre recalculado no servidor; webhook de pagamento assinado e idempotente.

## [Não lançado]

### Adicionado

- Mercado Pago configurado pelo painel do admin (Configurações → Financeiro): cole o Access Token e a
  assinatura do webhook, a plataforma confere o token na hora e mostra a conta, se é de teste ou de
  produção e o endereço do webhook pronto para copiar. Nada de pagamento no `.env`.
- Reembolso de ponta a ponta: o aluno pede em até 7 dias pela própria compra e acompanha o andamento; o
  admin aprova ou recusa com motivo na aba Reembolsos do Financeiro. Aprovado, o estorno sai pelo Mercado
  Pago (simulado na demonstração), o acesso e o certificado daquela compra são revogados e as comissões do
  produtor e do afiliado são descontadas. O aluno é avisado no sino.
- E-mail (SMTP) configurado pelo painel do admin (Configurações → E-mail), com atalhos para Resend, Brevo,
  Gmail e Amazon SES: a plataforma conecta no servidor ao salvar e manda um e-mail de teste para você.
  Nada de e-mail no `.env`.
- Comando `pnpm admin:create` (em produção, `node dist/database/create-admin.js`) para criar o primeiro
  admin pelo terminal, sem depender de e-mail.

### Mudado

- A parte do produtor numa venda fica "a liberar" por 7 dias (o prazo de reembolso do aluno) antes de poder
  ser sacada.
- Sem credenciais do Mercado Pago, a API sobe normalmente: em desenvolvimento a compra usa o simulador e
  em produção a compra de cursos pagos fica desligada, com aviso claro.

### Segurança

- As credenciais ficam cifradas no banco (AES-256-GCM) e nunca voltam para a tela nem para o log.
- A senha do e-mail fica cifrada no banco e só é reaproveitada com o mesmo servidor, porta e usuário; em
  produção o servidor precisa ser um endereço público.
- Em produção sem servidor de e-mail, o cadastro pelo site fica fechado com aviso.
- A compra que um produtor faz como aluno não entra mais no saldo de produtor dele (antes podia virar saldo
  para saque).
