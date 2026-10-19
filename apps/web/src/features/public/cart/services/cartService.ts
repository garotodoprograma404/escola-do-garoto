// =====================================================
// CART - SERVICE (dados atuais dos cursos do carrinho)
// =====================================================

import { apiServer } from '@/lib/server-api'
import type { CartItem } from '@/shared/types/cart'

export interface CartCourseSnapshot {
  id: string
  title: string
  slug: string
  thumbnail_url: string | null
  /** Preço que vale hoje (promoção, se houver), em reais. */
  price: number
  list_price: number
  discount_price: number | null
  producer_name: string
  coupons_enabled: boolean
}

/**
 * Dados ATUAIS (preço, título, disponibilidade) dos cursos do carrinho, direto da API.
 * O carrinho fica num cookie que o navegador pode editar; o que vale é o banco.
 * Devolve `null` se a API estiver fora do ar (quem chama decide o que fazer).
 */
export async function getCartCourseSnapshots(
  courseIds: number[],
): Promise<CartCourseSnapshot[] | null> {
  const ids = [...new Set(courseIds.filter((id) => Number.isSafeInteger(id) && id > 0))]
  if (ids.length === 0) return []

  const result = await apiServer<CartCourseSnapshot[]>('/public/cart/items', {
    query: { ids: ids.join(',') },
  })
  return result.ok ? result.data : null
}

/**
 * Atualiza os itens do cookie com o que está no banco: preço correto e sem curso que saiu do ar.
 * Se a API estiver indisponível, mantém os itens como estão (o checkout confere o preço de novo).
 */
export async function refreshCartItems(items: CartItem[]): Promise<CartItem[]> {
  const snapshots = await getCartCourseSnapshots(items.map((item) => Number.parseInt(item.id, 10)))
  if (!snapshots) return items

  const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]))
  return items.flatMap((item) => {
    const fresh = byId.get(String(Number.parseInt(item.id, 10)))
    if (!fresh) return []
    return [
      {
        id: fresh.id,
        title: fresh.title,
        slug: fresh.slug,
        price: fresh.price,
        thumbnail_url: fresh.thumbnail_url,
        producer_name: fresh.producer_name,
      },
    ]
  })
}
