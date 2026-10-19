/** Papéis com botão de entrada rápida no ambiente de demonstração (`DEMO_MODE=true`). */
export const DEMO_ROLES = [
  {
    role: 'student',
    short: 'Aluno',
    label: 'Entrar como aluno',
    hint: 'cursos, player, quiz e certificado',
  },
  {
    role: 'producer',
    short: 'Produtor',
    label: 'Entrar como produtor',
    hint: 'criação de cursos, vendas e analytics',
  },
  {
    role: 'admin',
    short: 'Admin',
    label: 'Entrar como administrador',
    hint: 'aprovação, certificados e configurações',
  },
] as const

export type DemoRole = (typeof DEMO_ROLES)[number]['role']

export function isDemoRole(value: unknown): value is DemoRole {
  return DEMO_ROLES.some((item) => item.role === value)
}
