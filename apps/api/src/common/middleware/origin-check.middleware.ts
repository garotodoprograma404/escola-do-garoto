import { ForbiddenException, Inject, Injectable, type NestMiddleware } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { ENV } from '../../config/config.module.js'
import type { Env } from '../../config/env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Defesa contra CSRF (além do cookie SameSite=Lax): requisições que alteram dados e vêm de um
 * navegador precisam ter `Origin` igual ao do front, e o navegador não pode marcá-las como
 * `cross-site` (`Sec-Fetch-Site`). Chamadas servidor-a-servidor (sem esses cabeçalhos) passam,
 * porque não carregam o cookie de sessão de ninguém automaticamente.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowedOrigin: string

  constructor(@Inject(ENV) env: Env) {
    this.allowedOrigin = new URL(env.WEB_ORIGIN).origin
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next()

    const origin = req.headers.origin
    const fetchSite = req.headers['sec-fetch-site']
    const originOk = !origin || origin === this.allowedOrigin
    const siteOk = fetchSite !== 'cross-site'
    if (originOk && siteOk) return next()

    throw new ForbiddenException('Origem da requisição não permitida')
  }
}
