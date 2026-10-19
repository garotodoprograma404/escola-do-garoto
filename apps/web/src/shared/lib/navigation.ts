import type { UserRole } from '@/shared/types/roles'

export interface NavItem {
  label: string
  href: string
  icon: string // Nome do ícone como string
}

/**
 * Mapeamento de roles para seus dashboards
 */
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: '/admin',
  producer: '/producer',
  affiliate: '/affiliate',
  student: '/student',
}

/**
 * Retorna o path do dashboard baseado na role do usuário
 * @param role - Role do usuário
 * @returns Path do dashboard
 */
export function getRoleDashboardPath(role: UserRole | string): string {
  if (role in ROLE_DASHBOARD_MAP) {
    return ROLE_DASHBOARD_MAP[role as UserRole]
  }
  return '/student'
}

/**
 * Retorna o path padrão quando role não é encontrada
 * @returns Path padrão
 */
export function getDefaultDashboardPath(): string {
  return '/student'
}

/**
 * Retorna os itens de navegação baseado na role do usuário
 * @param role - Role do usuário
 * @returns Array de itens de navegação
 */
export function getNavItemsByRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'student':
      return [
        { label: 'Início', href: '/student', icon: 'Home' },
        { label: 'Catálogo', href: '/catalogo', icon: 'Grid' },
        { label: 'Meus Cursos', href: '/student/courses', icon: 'BookOpen' },
        { label: 'Afiliado', href: '/minha-conta/afiliado', icon: 'Tag' },
        { label: 'Conquistas', href: '/student/conquistas', icon: 'Trophy' },
        { label: 'Certificados', href: '/student/certificates', icon: 'Award' },
        { label: 'Anotações', href: '/student/notes', icon: 'StickyNote' },
        { label: 'Perguntas', href: '/student/questions', icon: 'MessageCircle' },
        { label: 'Financeiro', href: '/student/financials', icon: 'DollarSign' },
        { label: 'Suporte', href: '/student/support', icon: 'LifeBuoy' },
      ]

    case 'producer':
      return [
        { label: 'Dashboard', href: '/producer', icon: 'LayoutDashboard' },
        { label: 'Meus Cursos', href: '/producer/courses', icon: 'Video' },
        { label: 'Analytics', href: '/producer/analytics', icon: 'BarChart2' },
        { label: 'Financeiro', href: '/producer/financials', icon: 'DollarSign' },
        { label: 'Perguntas', href: '/producer/qna', icon: 'MessageCircle' },
        { label: 'Avaliações', href: '/producer/reviews', icon: 'Star' },
        { label: 'Academy', href: '/producer/academy', icon: 'GraduationCap' },
      ]

    case 'affiliate':
      return [
        { label: 'Dashboard', href: '/affiliate', icon: 'LayoutDashboard' },
        { label: 'Perfil', href: '/affiliate/profile', icon: 'User' },
      ]

    case 'admin':
      return [
        { label: 'Visão Geral', href: '/admin', icon: 'ShieldCheck' },
        { label: 'Usuários', href: '/admin/users', icon: 'Users' },
        { label: 'Afiliados', href: '/admin/affiliates', icon: 'Handshake' },
        { label: 'Produtores', href: '/admin/producer-leads', icon: 'Ticket' },
        { label: 'Certificados', href: '/admin/certificates', icon: 'Award' },
        { label: 'Cursos', href: '/admin/courses', icon: 'List' },
        { label: 'Financeiro', href: '/admin/finance', icon: 'DollarSign' },
        { label: 'Cupons', href: '/admin/coupons', icon: 'Tag' },
        { label: 'Categorias', href: '/admin/categories', icon: 'FolderTree' },
        { label: 'Conteúdo', href: '/admin/content', icon: 'Layout' },
        { label: 'Blog', href: '/admin/blog', icon: 'FileText' },
        { label: 'Suporte', href: '/admin/support', icon: 'LifeBuoy' },
        { label: 'Configs', href: '/admin/settings', icon: 'Settings' },
      ]

    default:
      return []
  }
}
