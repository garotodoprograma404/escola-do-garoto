// =====================================================
// CART CONTEXT - CLIENT COMPONENT
// =====================================================

'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  addToCartAction,
  removeFromCartAction,
  clearCartAction,
  getCartAction,
} from '@/shared/actions/cart-actions'
import type { CartItem, Cart } from '@/shared/types/cart'

interface CartContextType {
  cart: Cart
  isLoading: boolean
  addToCart: (item: CartItem) => Promise<{ success: boolean; message: string }>
  removeFromCart: (itemId: string) => Promise<{ success: boolean; message: string }>
  clearCart: () => Promise<{ success: boolean; message: string }>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Calculate cart totals
  const cart: Cart = {
    items,
    total: items.reduce((sum, item) => sum + item.price, 0),
    itemCount: items.length,
  }

  // Load cart from server
  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true)
      const cartItems = await getCartAction()
      setItems(cartItems)
    } catch (error) {
      console.error('Error loading cart:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load cart on mount
  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  // Add to cart
  const addToCart = useCallback(
    async (item: CartItem) => {
      const result = await addToCartAction(item)
      if (result.success) {
        await refreshCart()
      }
      return result
    },
    [refreshCart],
  )

  // Remove from cart
  const removeFromCart = useCallback(
    async (itemId: string) => {
      const result = await removeFromCartAction(itemId)
      if (result.success) {
        await refreshCart()
      }
      return result
    },
    [refreshCart],
  )

  // Clear cart
  const clearCart = useCallback(async () => {
    const result = await clearCartAction()
    if (result.success) {
      await refreshCart()
    }
    return result
  }, [refreshCart])

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
