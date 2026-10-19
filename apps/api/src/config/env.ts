import { z } from 'zod'

const envSchema = z
  .object({
    /** Obrigatório: ele liga as travas de produção abaixo, então não pode ter "padrão". */
    NODE_ENV: z.enum(['development', 'test', 'production']),
    /** Só a própria máquina por padrão. Em container, defina 0.0.0.0 e proteja pela rede. */
    API_HOST: z.string().min(1).default('127.0.0.1'),
    API_PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    /** Origem do front. Usada na checagem de Origin (CSRF), nos links de e-mail e no cookie Secure. */
    WEB_ORIGIN: z.url().default('http://localhost:3000'),
    /** `console` só escreve o e-mail no log: serve para desenvolvimento e testes. */
    MAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
    /** Com `MAIL_DRIVER=smtp`: servidor, porta, usuário/senha e remetente. */
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    /** `true` = TLS direto (465). `false` = STARTTLS (587). */
    SMTP_SECURE: z.stringbool().default(false),
    /** Exige STARTTLS (nunca manda e-mail em texto puro). Só pode ser desligado fora de produção (caixa de teste). */
    SMTP_REQUIRE_TLS: z.stringbool().default(true),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(3).optional(),
    /**
     * Quem o Express considera proxy confiável para ler o IP real no `X-Forwarded-For`
     * (lista separada por vírgula: `loopback`, `uniquelocal`, IP ou CIDR). Padrão: só a própria
     * máquina. Em container, o proxy (Caddy) é outro container: use `uniquelocal`.
     */
    TRUSTED_PROXIES: z.string().min(1).default('loopback'),
    RATE_LIMIT_ENABLED: z.stringbool().default(true),
    /**
     * Segredo compartilhado com o servidor do Next. Chamadas dele com este valor no cabeçalho
     * `x-internal-key` não entram no limite por IP (ver `isInternalCall`). Gere com
     * `openssl rand -hex 32` e use o MESMO valor no apps/web.
     */
    INTERNAL_API_KEY: z.string().min(32).optional(),
    /** Pasta onde os arquivos enviados ficam (disco local). Em produção, um volume persistente. */
    FILES_DIR: z.string().min(1).default('./storage'),
    /**
     * Segredo das URLs assinadas (arquivos privados, ex.: certificados) e base da chave que cifra as
     * credenciais do Mercado Pago no banco (trocar este valor obriga a cadastrá-las de novo no
     * painel). `openssl rand -hex 32`.
     */
    FILES_SIGNING_SECRET: z.string().min(32).optional(),

    /**
     * Ambiente de DEMONSTRAÇÃO publicado. Em produção: pagamento sempre pelo simulador (nada é
     * cobrado, mesmo com credenciais do Mercado Pago no painel) e e-mail no log
     * (`MAIL_DRIVER=console`), com as contas novas já confirmadas. Todas as outras travas de
     * produção continuam valendo. Nunca ligue num site que vende de verdade.
     *
     * O Mercado Pago NÃO é configurado aqui: o admin cola as credenciais no painel (Configurações →
     * Financeiro) e elas ficam cifradas no banco (ver `PaymentCredentialsService`).
     */
    DEMO_MODE: z.stringbool().default(false),
    /** Prefixo dos códigos de certificado (marca da plataforma): 2 a 8 letras maiúsculas. */
    CERTIFICATE_CODE_PREFIX: z
      .string()
      .regex(/^[A-Z]{2,8}$/, 'use de 2 a 8 letras maiúsculas')
      .default('GAROTO'),
  })
  .superRefine((env, ctx) => {
    const fail = (path: keyof typeof env, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    if (env.MAIL_DRIVER === 'smtp') {
      if (!env.SMTP_HOST) fail('SMTP_HOST', 'obrigatório com MAIL_DRIVER=smtp')
      if (!env.MAIL_FROM) fail('MAIL_FROM', 'obrigatório com MAIL_DRIVER=smtp')
      if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) {
        fail('SMTP_PASSWORD', 'SMTP_USER e SMTP_PASSWORD andam juntos')
      }
    }

    // Na demonstração a conta nova nasce confirmada porque não há e-mail de verdade: com SMTP
    // ligado, isso deixaria alguém ocupar o e-mail real de outra pessoa sem abrir o link.
    if (env.DEMO_MODE && env.MAIL_DRIVER !== 'console') {
      fail('MAIL_DRIVER', 'com DEMO_MODE o e-mail fica só no log ("console")')
    }

    if (env.NODE_ENV !== 'production') return

    if (env.MAIL_DRIVER === 'console' && !env.DEMO_MODE) {
      fail('MAIL_DRIVER', 'não pode ser "console" em produção')
    }
    if (env.MAIL_DRIVER === 'smtp' && !env.SMTP_SECURE && !env.SMTP_REQUIRE_TLS) {
      fail(
        'SMTP_REQUIRE_TLS',
        'em produção o e-mail precisa de TLS (SMTP_SECURE=true ou SMTP_REQUIRE_TLS=true)',
      )
    }
    if (!env.RATE_LIMIT_ENABLED) fail('RATE_LIMIT_ENABLED', 'não pode ser desligado em produção')
    if (new URL(env.WEB_ORIGIN).protocol !== 'https:')
      fail('WEB_ORIGIN', 'precisa ser https em produção')
    if (!env.INTERNAL_API_KEY) fail('INTERNAL_API_KEY', 'obrigatório em produção')
    if (!env.FILES_SIGNING_SECRET) fail('FILES_SIGNING_SECRET', 'obrigatório em produção')
  })
  .transform((env) => ({
    ...env,
    /** Cookie só trafega por HTTPS quando o site é HTTPS (nunca depende de adivinhar o ambiente). */
    COOKIE_SECURE: new URL(env.WEB_ORIGIN).protocol === 'https:',
  }))

export type Env = z.infer<typeof envSchema>

/** Lê e valida as variáveis de ambiente. Falha cedo, com mensagem clara, se faltar algo. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Variável em branco (`SMTP_USER=` no .env, ou `${VAR:-}` no compose) vale como "não definida".
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''))
  const parsed = envSchema.safeParse(present)
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas:\n${z.prettifyError(parsed.error)}`)
  }
  return parsed.data
}
