import type { Request } from 'express'
import { clientIp } from '../auth/throttling.js'

export type AuditContext = { ipAddress: string | null; userAgent: string | null }

/** IP (validado) e navegador de quem fez a ação, para a trilha de auditoria. */
export function auditContext(req: Request): AuditContext {
  return {
    ipAddress: clientIp(req) ?? null,
    userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
  }
}
