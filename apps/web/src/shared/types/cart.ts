// =====================================================
// CART - TYPES
// =====================================================

export interface CartItem {
  id: string
  title: string
  slug: string
  price: number
  thumbnail_url: string | null
  producer_name: string
}

export interface Cart {
  items: CartItem[]
  total: number
  itemCount: number
}
