import 'server-only'
import type { AuthResponse, MessageResponse } from '@vox/contracts'
import { getCurrentUser } from '@/lib/session'
import { apiServer } from '@/lib/server-api'
import type { LoginInput, RegisterInput } from '../lib/validations'
import type { DemoRole } from '../lib/demo-roles'

/** Fala com a API de autenticação (NestJS). Quem guarda a sessão é o cookie `vox_session`. */
export const authService = {
  /** Ambiente de demonstração: entra na conta fixa do papel (a API recusa fora do DEMO_MODE). */
  async demoLogin(role: DemoRole): Promise<AuthResponse> {
    const result = await apiServer<AuthResponse>('/auth/demo-login', {
      body: { role },
      forwardCookies: true,
    })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },

  async login(credentials: LoginInput): Promise<AuthResponse> {
    const result = await apiServer<AuthResponse>('/auth/login', {
      body: credentials,
      forwardCookies: true,
    })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },

  /**
   * Cria a conta. A conta só entra depois de confirmar o e-mail (a API manda o link), então nunca
   * há login automático: devolve a mensagem para a tela.
   */
  async register(input: RegisterInput): Promise<MessageResponse> {
    const result = await apiServer<MessageResponse>('/auth/register', {
      body: { name: input.name, email: input.email, password: input.password },
    })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  },

  async forgotPassword(email: string): Promise<void> {
    const result = await apiServer('/auth/password/forgot', { body: { email } })
    if (!result.ok) throw new Error(result.error.message)
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const result = await apiServer('/auth/password/reset', { body: { token, password } })
    if (!result.ok) throw new Error(result.error.message)
  },

  async logout(): Promise<void> {
    await apiServer('/auth/logout', { method: 'POST', forwardCookies: true })
  },

  async getUser() {
    return getCurrentUser()
  },
}
