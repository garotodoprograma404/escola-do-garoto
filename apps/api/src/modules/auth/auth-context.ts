import type { SessionUser } from '@vox/contracts'

/** O que o SessionGuard anexa na requisição autenticada. */
export type AuthContext = {
  user: SessionUser
  sessionId: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}
