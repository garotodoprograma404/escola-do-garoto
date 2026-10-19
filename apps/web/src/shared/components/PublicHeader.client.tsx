// =====================================================
// PUBLIC HEADER - CLIENT COMPONENT
// =====================================================

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BookOpen, ShoppingCart, Sun, Moon, Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from 'next-themes'
import { useCart } from '@/shared/context/CartContext'
import type { AuthResponse } from '@vox/contracts'
import { apiRequest } from '@/lib/api-client'
import { getRoleDashboardPath } from '@/shared/lib/navigation'

interface PublicHeaderProps {
  platformName: string
  logoUrl?: string
  initialIsAuthenticated?: boolean
  initialDashboardPath?: string
}

export function PublicHeader({
  platformName,
  logoUrl,
  initialIsAuthenticated = false,
  initialDashboardPath = '/student',
}: PublicHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { cart } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated)
  const [dashboardPath, setDashboardPath] = useState(initialDashboardPath)
  const normalizedLogoUrl = logoUrl?.trim() || ''
  const hasLogo = normalizedLogoUrl.length > 0

  const isActive = (path: string) => pathname === path

  // Sessão vem da API: `/api/auth/me` devolve quem está logado e os papéis (o primeiro é o principal).
  const syncAuthState = useCallback(async () => {
    const result = await apiRequest<AuthResponse>('/auth/me')

    if (!result.ok) {
      setIsAuthenticated(false)
      setDashboardPath('/student')
      return
    }

    const role = result.data.user.roles[0]
    setIsAuthenticated(true)
    setDashboardPath(role ? getRoleDashboardPath(role) : '/student')
  }, [])

  useEffect(() => {
    void syncAuthState()
  }, [syncAuthState, pathname])

  async function handleLogout() {
    await apiRequest('/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {/* Desktop Header - Floating Island */}
      <header className="pointer-events-none fixed left-0 right-0 top-[calc(var(--demo-bar,0px)+1.5rem)] z-50 hidden justify-center px-4 lg:flex">
        <div className="pointer-events-auto flex w-full max-w-7xl items-center justify-between rounded-full border border-white/20 bg-white/90 px-6 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:bg-white dark:border-slate-700/50 dark:bg-slate-900/90 dark:hover:bg-slate-900">
          {/* Logo */}
          <Link href="/" className="group flex shrink-0 cursor-pointer items-center gap-2 pr-4">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizedLogoUrl}
                alt={`Logo ${platformName}`}
                className="h-9 w-auto max-w-[10rem] object-contain"
              />
            ) : (
              <>
                <div className="rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-transform group-hover:scale-110">
                  <BookOpen size={20} />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {platformName}
                </span>
              </>
            )}
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                isActive('/')
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              href="/catalogo"
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                isActive('/catalog') || isActive('/catalogo')
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
              }`}
            >
              Catálogo
            </Link>
            <Link
              href="/blog"
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                isActive('/blog') || pathname.startsWith('/blog/')
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
              }`}
            >
              Blog
            </Link>
            <Link
              href="/become-producer"
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                isActive('/become-producer')
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
              }`}
            >
              Ensinar
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-3 pl-4">
            <button
              type="button"
              aria-label="Alternar tema claro e escuro"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Sun size={20} className="hidden dark:block" />
              <Moon size={20} className="block dark:hidden" />
            </button>
            <Link
              href="/cart"
              aria-label={
                cart.itemCount > 0
                  ? `Carrinho, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'itens'}`
                  : 'Carrinho'
              }
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ShoppingCart size={20} />
              {cart.itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {cart.itemCount}
                </span>
              )}
            </Link>
            <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={dashboardPath} className="inline-flex items-center gap-2">
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2"
                  >
                    <LogOut size={14} />
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Entrar</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">Cadastrar</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-[var(--demo-bar,0px)] z-40 flex h-16 items-center justify-between border-b border-slate-200/50 bg-white/80 px-4 backdrop-blur-md transition-colors dark:border-slate-800/50 dark:bg-slate-900/80 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={normalizedLogoUrl}
              alt={`Logo ${platformName}`}
              className="h-8 w-auto max-w-[8rem] object-contain"
            />
          ) : (
            <>
              <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
                <BookOpen size={20} />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {platformName}
              </span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Alternar tema claro e escuro"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-slate-600 dark:text-slate-400"
          >
            <Sun size={20} className="hidden dark:block" />
            <Moon size={20} className="block dark:hidden" />
          </button>
          <Link
            href="/cart"
            aria-label={
              cart.itemCount > 0
                ? `Carrinho, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'itens'}`
                : 'Carrinho'
            }
            className="relative text-slate-600 dark:text-slate-400"
          >
            <ShoppingCart size={22} />
            {cart.itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {cart.itemCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600 dark:text-slate-400"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[var(--demo-bar,0px)] z-30 bg-white pt-16 dark:bg-slate-900 lg:hidden">
          <nav className="flex flex-col space-y-2 p-4">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-4 py-3 text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
            >
              Home
            </Link>
            <Link
              href="/catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-4 py-3 text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
            >
              Catálogo
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-4 py-3 text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
            >
              Blog
            </Link>
            <Link
              href="/become-producer"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-4 py-3 text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
            >
              Ensinar
            </Link>
            <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              {isAuthenticated ? (
                <>
                  <Button className="w-full" asChild>
                    <Link href={dashboardPath} onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button className="w-full" variant="outline" onClick={handleLogout}>
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Button className="w-full" asChild>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      Entrar
                    </Link>
                  </Button>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      Cadastrar
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
