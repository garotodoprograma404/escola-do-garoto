// =====================================================
// MOBILE BENTO MENU - Client Component
// =====================================================

'use client'

import Link from 'next/link'
import { BookOpen, LogOut, Moon, Sun, User, X } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useIsDarkTheme } from '@/shared/hooks/useIsDarkTheme'
import type { NavItem } from '@/shared/lib/navigation'
import type { UserRole } from '@/shared/types/roles'
import { getIcon } from '@/shared/lib/icon-map'

interface MobileBentoMenuProps {
  isOpen: boolean
  onClose: () => void
  userRole: UserRole
  navItems: NavItem[]
  userName: string
  platformName: string
  onLogout: () => void
}

export function MobileBentoMenu({
  isOpen,
  onClose,
  userRole,
  navItems,
  userName,
  platformName,
  onLogout,
}: MobileBentoMenuProps) {
  const { setTheme } = useTheme()
  const isDark = useIsDarkTheme()

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm duration-200 animate-in fade-in lg:hidden"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white duration-300 animate-in slide-in-from-bottom dark:bg-slate-900 lg:hidden">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-brand-500 p-1.5 text-black">
              <BookOpen size={18} />
            </div>
            <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {platformName}
            </h2>
          </div>
          <div className="ml-3 mr-auto min-w-0">
            <p className="text-sm text-slate-600 dark:text-slate-400">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Ações rápidas */}
        <div className="px-6 pt-6">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/${userRole}/profile`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <User size={18} />
              Perfil
            </Link>
            <button
              type="button"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Alternar tema"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              Tema
            </button>
          </div>
        </div>

        {/* Grid de Opções */}
        <div className="grid grid-cols-3 gap-4 p-6">
          {navItems.map((item) => {
            const Icon = getIcon(item.icon)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                <div className="rounded-xl bg-brand-500/10 p-3 text-brand-500">
                  <Icon size={24} />
                </div>
                <span className="text-center text-xs font-medium text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Logout Button */}
        <div className="p-6 pt-0">
          <button
            onClick={() => {
              onLogout()
              onClose()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>
    </>
  )
}
