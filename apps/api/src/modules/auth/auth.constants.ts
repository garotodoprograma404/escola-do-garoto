/**
 * Validade fixa da sessão. Sem renovação automática: o cookie do navegador só é regravado no
 * login, então estender só no banco criaria uma sessão "viva" que o navegador já esqueceu.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
/** Intervalo mínimo entre dois e-mails de redefinição para a mesma conta (anti e-mail-bomb). */
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
/** Intervalo mínimo entre dois e-mails de confirmação para a mesma conta. */
export const EMAIL_VERIFICATION_COOLDOWN_MS = 60 * 1000

/**
 * Limites por IP nas rotas sensíveis (janela de 1 minuto): `default` para quem chama a API direto e
 * `visitor` para quem vem pelo site (o Next repassa o IP). Há também o limite por conta.
 */
const MINUTE = 60_000
const perIp = (limit: number) => ({
  default: { limit, ttl: MINUTE },
  visitor: { limit, ttl: MINUTE },
})
export const RATE_LIMITS = {
  login: perIp(10),
  register: perIp(5),
  forgotPassword: perIp(3),
  verifyEmail: perIp(10),
  resendVerification: perIp(3),
  resetPassword: perIp(5),
} as const
