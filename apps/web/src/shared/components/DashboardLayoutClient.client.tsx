'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DashboardSidebar } from './DashboardSidebar.client'
import { DashboardHeader } from './DashboardHeader.client'
import { MobileBottomNav } from './MobileBottomNav.client'
import { MobileBentoMenu } from './MobileBentoMenu.client'
import type { UserRole } from '@/shared/types/roles'
import { getNavItemsByRole, type NavItem } from '@/shared/lib/navigation'
import type { Notification } from '@/shared/types/notifications'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string | null
}

interface DashboardLayoutClientProps {
  user: User
  userRole: UserRole
  availableRoles: UserRole[]
  navItems: NavItem[]
  platformName: string
  notifications: Notification[]
  unreadNotifications: number
  onLogout: () => void
  children: React.ReactNode
}

export function DashboardLayoutClient({
  user,
  userRole,
  availableRoles,
  navItems,
  platformName,
  notifications,
  unreadNotifications,
  onLogout,
  children,
}: DashboardLayoutClientProps) {
  const pathname = usePathname()

  const normalizedPathname = useMemo(() => {
    return (pathname || '').replace(/\/+$/, '')
  }, [pathname])

  const effectiveRole = useMemo<UserRole>(() => {
    if (normalizedPathname.startsWith('/affiliate')) {
      return 'affiliate'
    }

    if (normalizedPathname.startsWith('/producer')) {
      return 'producer'
    }

    if (normalizedPathname.startsWith('/admin')) {
      return 'admin'
    }

    if (
      normalizedPathname.startsWith('/student') ||
      normalizedPathname.startsWith('/minha-conta')
    ) {
      return 'student'
    }

    return userRole
  }, [normalizedPathname, userRole])

  const effectiveNavItems = useMemo(() => {
    const baseNavItems = effectiveRole === userRole ? navItems : getNavItemsByRole(effectiveRole)

    if (effectiveRole === 'affiliate') {
      const returnToPanelItem = availableRoles.includes('producer')
        ? { label: 'Painel do produtor', href: '/producer', icon: 'Video' }
        : availableRoles.includes('student')
          ? { label: 'Painel do estudante', href: '/student', icon: 'GraduationCap' }
          : null

      if (returnToPanelItem && !baseNavItems.some((item) => item.href === returnToPanelItem.href)) {
        return [...baseNavItems, returnToPanelItem]
      }
    }

    return baseNavItems
  }, [availableRoles, effectiveRole, navItems, userRole])

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const isStudentPlayerRoute = useMemo(
    () => /^\/student\/courses\/[^/]+\/player(?:\/.*)?$/.test(normalizedPathname),
    [normalizedPathname],
  )

  if (isStudentPlayerRoute) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <>
      <DashboardSidebar
        navItems={effectiveNavItems}
        onLogout={onLogout}
        platformName={platformName}
        isCollapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      <div
        className={`min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}
      >
        <DashboardHeader
          user={user}
          userRole={effectiveRole}
          isSidebarCollapsed={isSidebarCollapsed}
          notifications={notifications}
          unreadNotifications={unreadNotifications}
        />

        <main className="mx-auto max-w-[1920px] px-3 py-4 pb-20 pt-4 lg:p-6 lg:pb-6 lg:pt-20">
          {children}
        </main>
      </div>

      <MobileBottomNav
        userRole={effectiveRole}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMenuOpen={isMobileMenuOpen}
      />

      <MobileBentoMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userRole={effectiveRole}
        navItems={effectiveNavItems}
        userName={user.name}
        platformName={platformName}
        onLogout={onLogout}
      />
    </>
  )
}
