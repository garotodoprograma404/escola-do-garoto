import { z } from 'zod'

/** Papéis de usuário. A ordem não importa; um usuário pode ter vários. */
export const ROLES = ['student', 'producer', 'affiliate', 'admin'] as const
export const roleSchema = z.enum(ROLES)
// Explícito (sem z.infer) para o front, que usa outra versão do zod, ler o tipo sem depender do zod.
export type Role = (typeof ROLES)[number]

/** Prioridade para escolher o painel principal de quem tem mais de um papel. */
const ROLE_PRIORITY: readonly Role[] = ['admin', 'producer', 'affiliate', 'student']

export function getPrimaryRole(roles: readonly Role[]): Role | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null
}

/** E-mail sempre normalizado (sem espaços, minúsculo) antes de chegar no banco. */
export const emailSchema = z
  .string({ error: 'Informe o e-mail' })
  .trim()
  .toLowerCase()
  .max(254, 'E-mail longo demais')
  .pipe(z.email({ error: 'E-mail inválido' }))

/**
 * Política de senha (NIST SP 800-63B): tamanho mínimo, sem regras de "tem que ter símbolo".
 * Limite máximo para evitar DoS no hash (argon2 com senha gigante).
 */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 128
export const passwordSchema = z
  .string({ error: 'Informe a senha' })
  .min(PASSWORD_MIN, `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres`)
  .max(PASSWORD_MAX, `A senha pode ter no máximo ${PASSWORD_MAX} caracteres`)

export const nameSchema = z
  .string({ error: 'Informe o nome' })
  .trim()
  .min(2, 'Nome curto demais')
  .max(120, 'Nome longo demais')
  // Sem caracteres de controle nem de direção de texto (podem enganar e-mails, logs e telas de admin).
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, 'O nome contém caracteres inválidos')

export const registerInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  /** Para onde ir depois de confirmar o e-mail (caminho interno; a API revalida). */
  redirect: z.string().max(512).optional(),
})
export type RegisterInput = z.infer<typeof registerInputSchema>

export const loginInputSchema = z.object({
  email: emailSchema,
  // No login não aplicamos a política (senha antiga pode ser diferente); só limitamos o tamanho.
  password: z.string({ error: 'Informe a senha' }).min(1, 'Informe a senha').max(PASSWORD_MAX),
})
export type LoginInput = z.infer<typeof loginInputSchema>

export const verifyEmailInputSchema = z.object({
  token: z.string().min(20).max(200),
})
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>

export const resendVerificationInputSchema = z.object({ email: emailSchema })
export type ResendVerificationInput = z.infer<typeof resendVerificationInputSchema>

export const forgotPasswordInputSchema = z.object({ email: emailSchema })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>

export const resetPasswordInputSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
})
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>

/** O que a API devolve sobre o usuário logado. Nada além disso sai em resposta de auth. */
export type SessionUser = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  roles: Role[]
}

export type AuthResponse = { user: SessionUser }

/** O que um link de confirmação vai ativar (mostrado antes de a pessoa clicar em "confirmar"). */
export type EmailVerificationPreview = { name: string; email: string }

/** Resposta neutra de rotas que não podem revelar se uma conta existe. */
export type MessageResponse = { message: string }

/** Código do erro de login quando a senha está certa mas o e-mail ainda não foi confirmado. */
export const EMAIL_NOT_VERIFIED = 'email_not_verified'

/** Nome do cookie de sessão (a API grava; o proxy do front só checa se existe). */
export const SESSION_COOKIE_NAME = 'vox_session'
