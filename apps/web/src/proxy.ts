import type { AuthResponse } from '@vox/contracts'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'
import { NextResponse, type NextRequest } from 'next/server'
import { logOperationalError } from '@/shared/lib/observability'
import {
  AFFILIATE_QUERY_PARAM,
  AFFILIATE_SESSION_COOKIE_NAME,
  AFFILIATE_VISITOR_COOKIE_MAX_AGE_SECONDS,
  AFFILIATE_VISITOR_COOKIE_NAME,
  generateAffiliateTrackingKey,
  isValidAffiliateTrackingKey,
  normalizeAffiliateCode,
} from '@/features/affiliate/lib/attribution'
import { registerAffiliateClickAttribution } from '@/features/affiliate/services/affiliate-attribution-service'

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3333'
const SESSION_LOOKUP_TIMEOUT_MS = 3000

function isAffiliateCaptureRoute(pathname: string): boolean {
  return (
    pathname === '/catalog' ||
    pathname === '/catalogo' ||
    pathname === '/cart' ||
    pathname.startsWith('/courses/') ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/')
  )
}

function cloneResponseCookies(source: NextResponse, target: NextResponse): void {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
}

async function maybeCaptureAffiliateClick(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!isAffiliateCaptureRoute(request.nextUrl.pathname)) {
    return response
  }

  const affiliateCode = normalizeAffiliateCode(
    request.nextUrl.searchParams.get(AFFILIATE_QUERY_PARAM),
  )

  if (!affiliateCode) {
    return response
  }

  const existingSessionKey = request.cookies.get(AFFILIATE_SESSION_COOKIE_NAME)?.value?.trim()
  const existingVisitorKey = request.cookies.get(AFFILIATE_VISITOR_COOKIE_NAME)?.value?.trim()
  // Cookie com formato estranho (adulterado ou inválido) é trocado por uma chave nova.
  const sessionKey = isValidAffiliateTrackingKey(existingSessionKey)
    ? existingSessionKey
    : generateAffiliateTrackingKey()
  const visitorKey = isValidAffiliateTrackingKey(existingVisitorKey)
    ? existingVisitorKey
    : generateAffiliateTrackingKey()

  try {
    // A API responde igual para código que existe e que não existe (não revela quais existem), por
    // isso os cookies de rastreio são gravados sempre que há `?aff=`. Se a API falhar, cai no
    // `catch` e a navegação segue normalmente, sem cookies.
    await registerAffiliateClickAttribution({
      code: affiliateCode,
      sessionKey,
      visitorKey,
      path: request.nextUrl.pathname,
      search: request.nextUrl.search,
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent'),
      // Só o último IP da lista: é o que o proxy reverso confiável escreveu.
      forwardedFor: request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || null,
    })

    response.cookies.set({
      name: AFFILIATE_SESSION_COOKIE_NAME,
      value: sessionKey,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
    })

    response.cookies.set({
      name: AFFILIATE_VISITOR_COOKIE_NAME,
      value: visitorKey,
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: AFFILIATE_VISITOR_COOKIE_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    logOperationalError('proxy.affiliate.capture', error, {
      path: request.nextUrl.pathname,
      affiliateCode,
    })
    return response
  }
}

/**
 * Quem está logado e com quais papéis ativos, perguntando à API (que é quem valida a sessão).
 * Sem cookie de sessão nem chama a API. `null` = não está logado.
 */
async function lookupSession(request: NextRequest): Promise<AuthResponse['user'] | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  try {
    const internalKey = process.env.INTERNAL_API_KEY
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        ...(internalKey ? { 'x-internal-key': internalKey } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(SESSION_LOOKUP_TIMEOUT_MS),
    })
    if (!response.ok) return null
    return ((await response.json()) as AuthResponse).user
  } catch (error) {
    // API fora do ar ou lenta: trata como deslogado (igual ao tratamento de token inválido).
    logOperationalError('proxy.auth.me', error, { path: request.nextUrl.pathname })
    return null
  }
}

export async function proxy(request: NextRequest) {
  const response = await maybeCaptureAffiliateClick(
    request,
    NextResponse.next({ request: { headers: request.headers } }),
  )

  // URL amigável em português: /catalogo → /catalog
  if (request.nextUrl.pathname === '/catalogo') {
    const rewriteResponse = NextResponse.rewrite(new URL('/catalog', request.url))
    cloneResponseCookies(response, rewriteResponse)
    return rewriteResponse
  }

  const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/producer',
    '/affiliate',
    '/student',
    '/minha-conta',
  ]
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  )
  const authRoutes = ['/login', '/register', '/forgot-password']
  const isAuthRoute = authRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isAffiliateRoute = request.nextUrl.pathname.startsWith('/affiliate')

  // Rotas públicas não devem pagar custo de sessão/auth no middleware.
  if (!isProtectedRoute && !isAuthRoute) {
    return response
  }

  const user = await lookupSession(request)

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const roleDashboardMap: Record<string, string> = {
    admin: '/admin',
    super_admin: '/admin',
    producer: '/producer',
    affiliate: '/affiliate',
    student: '/student',
  }

  // A API devolve os papéis ativos do mais antigo para o mais novo: o primeiro é o papel principal.
  const activeRoles: string[] = user?.roles ?? []
  const activeRole: string | null = activeRoles[0] ?? null

  const hasAdminAccess = activeRoles.includes('admin') || activeRoles.includes('super_admin')
  const hasAffiliateAccess = activeRoles.includes('affiliate')

  if (isAdminRoute && user && !hasAdminAccess) {
    if (!activeRole) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const fallbackDashboard = roleDashboardMap[activeRole] ?? '/student'
    return NextResponse.redirect(new URL(fallbackDashboard, request.url))
  }

  if (isAffiliateRoute && user && !hasAffiliateAccess) {
    if (!activeRole) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const fallbackDashboard = roleDashboardMap[activeRole] ?? '/student'
    return NextResponse.redirect(new URL(fallbackDashboard, request.url))
  }

  if (isAuthRoute && user) {
    // Mapear role para dashboard
    const dashboardPath = activeRole ? roleDashboardMap[activeRole] || '/student' : '/student' // Default para student se não tiver role

    return NextResponse.redirect(new URL(dashboardPath, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/catalogo',
    '/catalog',
    '/cart',
    '/checkout/:path*',
    '/courses/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/dashboard/:path*',
    '/admin/:path*',
    '/producer/:path*',
    '/affiliate/:path*',
    '/student/:path*',
    '/minha-conta/:path*',
  ],
}
