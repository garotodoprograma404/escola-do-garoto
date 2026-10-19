import { SESSION_COOKIE_NAME } from '@vox/contracts'
import type { CookieOptions, Response } from 'express'

function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure, path: '/' }
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date, secure: boolean) {
  res.cookie(SESSION_COOKIE_NAME, token, { ...baseOptions(secure), expires: expiresAt })
}

export function clearSessionCookie(res: Response, secure: boolean) {
  res.clearCookie(SESSION_COOKIE_NAME, baseOptions(secure))
}
