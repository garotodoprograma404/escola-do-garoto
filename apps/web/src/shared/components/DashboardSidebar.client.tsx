// =====================================================
// DASHBOARD SIDEBAR - Client Component
// =====================================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, PanelLeftClose, PanelLeft, BookOpen } from 'lucide-react'
import type { NavItem } from '@/shared/lib/navigation'
import { getIcon } from '@/shared/lib/icon-map'

interface DashboardSidebarProps {
  navItems: NavItem[]
  onLogout: () => void
  platformName: string
  isCollapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  homeHref?: string
}

export function DashboardSidebar({
  navItems,
  onLogout,
  platformName,
  isCollapsed,
  onCollapsedChange,
  homeHref,
}: DashboardSidebarProps) {
  const pathname = usePathname()

  // Use the first nav item as home if not provided
  const dashboardHome = homeHref || navItems[0]?.href || '/dashboard'

  return (
    <aside
      className={`fixed bottom-0 left-0 top-[var(--demo-bar,0px)] z-50 hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:flex ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div
        className={`flex h-16 items-center ${
          isCollapsed ? 'justify-center' : 'justify-between px-6'
        } border-b border-slate-100 dark:border-slate-800`}
      >
        <Link
          href={dashboardHome}
          className="flex cursor-pointer items-center gap-2 overflow-hidden"
        >
          <div className="shrink-0 rounded-lg bg-brand-500 p-1.5 text-black">
            <BookOpen size={20} />
          </div>
          {!isCollapsed && (
            <span className="truncate whitespace-nowrap text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {platformName}
            </span>
          )}
        </Link>
        {!isCollapsed && (
          <button
            onClick={() => onCollapsedChange(true)}
            className="text-slate-600 transition-colors hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Colapsar sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <div
        className={`flex-1 py-6 ${isCollapsed ? 'overflow-hidden' : 'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent overflow-y-auto'}`}
      >
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = getIcon(item.icon)
            // Exact match or starts with the href followed by a slash
            // But exclude if there's a longer matching route
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href + '/') &&
                !navItems.some(
                  (otherItem) =>
                    otherItem.href !== item.href &&
                    otherItem.href.length > item.href.length &&
                    pathname.startsWith(otherItem.href),
                ))

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-500 font-bold text-black shadow-md shadow-brand-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon size={20} className="shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap text-sm">{item.label}</span>}
                {isCollapsed && (
                  <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Expand Button (when collapsed) */}
      {isCollapsed && (
        <div className="px-3 pb-4">
          <button
            onClick={() => onCollapsedChange(false)}
            className="flex w-full items-center justify-center rounded-xl px-3 py-3 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Expandir sidebar"
          >
            <PanelLeft size={20} />
          </button>
        </div>
      )}

      {/* Logout Button */}
      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        <button
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-red-700 transition-all duration-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Sair' : undefined}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
        </button>
      </div>
    </aside>
  )
}
