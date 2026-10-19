import 'server-only'

import { cookies } from 'next/headers'
import type { CartItem } from '@/shared/types/cart'

const CART_COOKIE_NAME = 'cart'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>

      const id = String(row.id || '').trim()
      const title = String(row.title || '').trim()
      const slug = String(row.slug || '').trim()
      const producerName = String(row.producer_name || '').trim()
      const price = Number(row.price)

      if (!id || !title || !slug || !producerName || !Number.isFinite(price) || price < 0) {
        return null
      }

      return {
        id,
        title,
        slug,
        price,
        thumbnail_url:
          typeof row.thumbnail_url === 'string' && row.thumbnail_url.trim().length > 0
            ? row.thumbnail_url
            : null,
        producer_name: producerName,
      } satisfies CartItem
    })
    .filter((item): item is CartItem => Boolean(item))
}

function parseCartCookie(rawValue: string): CartItem[] {
  const value = String(rawValue || '').trim()
  if (!value) return []

  try {
    return normalizeCartItems(JSON.parse(value))
  } catch {
    // Fallback for URL-encoded cookie values.
    try {
      return normalizeCartItems(JSON.parse(decodeURIComponent(value)))
    } catch {
      return []
    }
  }
}

export async function getCartFromCookiesServer(): Promise<CartItem[]> {
  const cookieStore = await cookies()
  const cartCookie = cookieStore.get(CART_COOKIE_NAME)

  if (!cartCookie?.value) {
    return []
  }

  return parseCartCookie(cartCookie.value)
}

export async function saveCartToCookiesServer(items: CartItem[]): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CART_COOKIE_NAME, JSON.stringify(items), {
    maxAge: CART_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
}
