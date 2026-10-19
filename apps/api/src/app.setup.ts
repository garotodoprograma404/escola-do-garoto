import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

/** Opções de criação que o `main.ts` e os testes usam em conjunto com `configureApp`. */
export const APP_CREATE_OPTIONS = {
  // A API só fala JSON: sem parser de formulário, o corpo `application/x-www-form-urlencoded`
  // (o único que um <form> de outro site consegue mandar sem preflight) nunca é lido.
  bodyParser: false,
} as const

/**
 * Configuração do app HTTP compartilhada entre `main.ts` e os testes e2e,
 * para o teste rodar exatamente o que roda em produção.
 *
 * `trust proxy: loopback`: o proxy reverso (Caddy/nginx) roda na mesma máquina e SOBRESCREVE o
 * X-Forwarded-For com o IP real do cliente. Não coloque o rewrite do Next entre o usuário e a
 * API em produção: ele repassa o cabeçalho que o cliente mandou (ver infra/Caddyfile.example).
 */
export function configureApp(
  app: NestExpressApplication,
  trustedProxies = 'loopback',
): NestExpressApplication {
  app.setGlobalPrefix('api')
  app.set(
    'trust proxy',
    trustedProxies.split(',').map((item) => item.trim()),
  )
  app.use(helmet())
  // 1 MB: aulas e posts de blog guardam HTML do editor rico dentro do JSON.
  app.useBodyParser('json', { limit: '1mb' })
  app.use(cookieParser())
  // Respostas de autenticação nunca podem ser guardadas em cache (nem de navegador, nem de CDN).
  app.use(
    '/api/auth',
    (_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => {
      res.setHeader('Cache-Control', 'no-store')
      next()
    },
  )
  // Vitrine pública: um CDN/proxy pode guardar por 1 min e servir "velho" por mais 5 enquanto atualiza.
  app.use(
    '/api/public',
    (
      req: { method: string },
      res: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
      }
      next()
    },
  )
  app.enableShutdownHooks()
  return app
}
