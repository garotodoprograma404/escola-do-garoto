'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Sun, Moon, ChevronRight } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useIsDarkTheme } from '@/shared/hooks/useIsDarkTheme'
import type { UserRole } from '@/shared/types/roles'
import type { Notification } from '@/shared/types/notifications'
import { RealtimeNotifications } from '@/features/chat/components/RealtimeNotifications.client'
import { NotificationBell } from './NotificationBell.client'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string | null
}

interface DashboardHeaderProps {
  user: User
  userRole: UserRole
  isSidebarCollapsed: boolean
  notifications: Notification[]
  unreadNotifications: number
}

export function DashboardHeader({
  user,
  userRole,
  isSidebarCollapsed,
  notifications,
  unreadNotifications,
}: DashboardHeaderProps) {
  const { setTheme } = useTheme()
  const isDark = useIsDarkTheme()

  return (
    <header
      className={`fixed right-0 top-[var(--demo-bar,0px)] z-40 hidden h-16 items-center justify-end border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900/80 lg:flex`}
      style={{ left: isSidebarCollapsed ? '5rem' : '16rem' }}
    >
      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        <RealtimeNotifications refreshOnNew />
        <NotificationBell notifications={notifications} unreadCount={unreadNotifications} />

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Alternar tema"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="mx-1 h-8 w-px bg-slate-200 dark:bg-slate-700"></div>

        {/* User Profile */}
        <Link
          href={`/${userRole}/profile`}
          className="flex items-center gap-3 rounded-full border border-transparent py-1.5 pl-2 pr-4 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
        >
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full border border-slate-200 object-cover dark:border-slate-600"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-brand-500 text-sm font-bold text-black dark:border-slate-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="hidden text-left xl:block">
            <p className="text-sm font-bold leading-none text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-600 dark:text-slate-400">
              {userRole === 'student'
                ? 'Aluno'
                : userRole === 'producer'
                  ? 'Produtor'
                  : userRole === 'affiliate'
                    ? 'Afiliado'
                    : 'Admin'}
            </p>
          </div>
          <ChevronRight size={14} className="text-slate-600 dark:text-slate-400" />
        </Link>
      </div>
    </header>
  )
}
