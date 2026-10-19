import { z } from 'zod'

/**
 * Contas fixas do ambiente de demonstração (criadas pelo seed). A tela de login mostra um botão
 * para cada papel e a rota `POST /api/auth/demo-login` entra nelas sem senha, só com `DEMO_MODE`.
 */
export const DEMO_ACCOUNTS = {
  admin: 'admin@escola.local',
  producer: 'produtor@escola.local',
  student: 'aluno@escola.local',
} as const

export const demoLoginSchema = z.object({ role: z.enum(['student', 'producer', 'admin']) })
export type DemoLoginInput = z.infer<typeof demoLoginSchema>
