// =====================================================
// MOBILE BOTTOM NAV - Client Component
// =====================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/shared/types/roles'
import { getIcon } from '@/shared/lib/icon-map'

interface MobileBottomNavProps {
  userRole: UserRole
  onMenuToggle: () => void
  isMenuOpen: boolean
  onChatToggle?: () => void
  isChatOpen?: boolean
}

interface NavButton {
  label: string
  href?: string
  icon: string
  onClick?: () => void
  isActive?: boolean
}

function getBottomNavButtons(
  role: UserRole,
  onMenuToggle: () => void,
  isMenuOpen: boolean,
): NavButton[] {
  const menuButton: NavButton = {
    label: 'Menu',
    icon: 'Grid',
    onClick: onMenuToggle,
    isActive: isMenuOpen,
  }

  switch (role) {
    case 'student':
      return [
        { label: 'Início', href: '/student', icon: 'Home' },
        { label: 'Anotações', href: '/student/notes', icon: 'StickyNote' },
        { label: 'Perguntas', href: '/student/questions', icon: 'MessageCircle' },
        { label: 'Financeiro', href: '/student/financials', icon: 'DollarSign' },
        menuButton,
      ]

    case 'producer':
      return [
        { label: 'Dashboard', href: '/producer', icon: 'LayoutDashboard' },
        { label: 'Cursos', href: '/producer/courses', icon: 'Video' },
        { label: 'Financeiro', href: '/producer/financials', icon: 'DollarSign' },
        menuButton,
      ]

    case 'affiliate':
      return [
        { label: 'Dashboard', href: '/affiliate', icon: 'LayoutDashboard' },
        { label: 'Perfil', href: '/affiliate/profile', icon: 'User' },
        menuButton,
      ]

    case 'admin':
      return [
        { label: 'Admin', href: '/admin', icon: 'ShieldCheck' },
        { label: 'Usuários', href: '/admin/users', icon: 'Users' },
        { label: 'Cursos', href: '/admin/courses', icon: 'Video' },
        menuButton,
      ]

    default:
      return [
        { label: 'Início', href: '/dashboard', icon: 'Home' },
        { label: 'Buscar', href: '/catalog', icon: 'Search' },
        menuButton,
      ]
  }
}

export function MobileBottomNav({ userRole, onMenuToggle, isMenuOpen }: MobileBottomNavProps) {
  const pathname = usePathname()
  const buttons = getBottomNavButtons(userRole, onMenuToggle, isMenuOpen)
  const rootPaths = new Set(['/student', '/producer', '/affiliate', '/admin', '/dashboard'])

  const matchesPath = (href?: string) => {
    if (!href) return false
    if (pathname === href) return true
    if (rootPaths.has(href)) return false
    return pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden">
      <div className="flex h-16 items-center gap-1 px-1.5">
        {buttons.map((button, index) => {
          const Icon = getIcon(button.icon)
          const isActive = button.isActive || matchesPath(button.href)

          if (button.onClick) {
            return (
              <button
                key={index}
                onClick={button.onClick}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                  isActive
                    ? 'text-brand-500'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon size={22} className="shrink-0" />
                <span className="max-w-full truncate text-[10px] font-medium leading-tight">
                  {button.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={index}
              href={button.href || '#'}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                isActive
                  ? 'text-brand-500'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon size={22} className="shrink-0" />
              <span className="max-w-full truncate text-[10px] font-medium leading-tight">
                {button.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
