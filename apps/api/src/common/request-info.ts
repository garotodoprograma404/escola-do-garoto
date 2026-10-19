import type { Request } from 'express'
import { clientIp } from '../modules/auth/throttling.js'

/** IP (validado, nunca o texto cru do X-Forwarded-For) e navegador, para a trilha de auditoria. */
export function requestInfo(req: Request): {
  ipAddress: string | undefined
  userAgent: string | undefined
} {
  return { ipAddress: clientIp(req), userAgent: req.get('user-agent') }
}
