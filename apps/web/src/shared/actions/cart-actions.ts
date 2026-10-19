// =====================================================
// CART - SERVER ACTIONS
// =====================================================

'use server'

import { revalidatePath } from 'next/cache'
import type { CartItem } from '@/shared/types/cart'
import { getCartFromCookiesServer, saveCartToCookiesServer } from '@/shared/lib/cart-cookie'

/**
 * Add item to cart
 */
export async function addToCartAction(
  item: CartItem,
): Promise<{ success: boolean; message: string }> {
  try {
    const cart = await getCartFromCookiesServer()

    // Check if item already exists
    const existingItem = cart.find((i) => i.id === item.id)
    if (existingItem) {
      return {
        success: false,
        message: 'Este curso já está no carrinho',
      }
    }

    // Add new item
    const updatedCart = [...cart, item]
    await saveCartToCookiesServer(updatedCart)

    // Revalidate pages that show cart
    revalidatePath('/')
    revalidatePath('/cart')
    revalidatePath('/checkout')

    return {
      success: true,
      message: 'Curso adicionado ao carrinho',
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
    return {
      success: false,
      message: 'Erro ao adicionar ao carrinho',
    }
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCartAction(
  itemId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const cart = await getCartFromCookiesServer()
    const updatedCart = cart.filter((i) => i.id !== itemId)

    await saveCartToCookiesServer(updatedCart)

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/cart')
    revalidatePath('/checkout')

    return {
      success: true,
      message: 'Curso removido do carrinho',
    }
  } catch (error) {
    console.error('Error removing from cart:', error)
    return {
      success: false,
      message: 'Erro ao remover do carrinho',
    }
  }
}

/**
 * Clear cart
 */
export async function clearCartAction(): Promise<{ success: boolean; message: string }> {
  try {
    await saveCartToCookiesServer([])

    // Revalidate pages
    revalidatePath('/')
    revalidatePath('/cart')
    revalidatePath('/checkout')

    return {
      success: true,
      message: 'Carrinho limpo',
    }
  } catch (error) {
    console.error('Error clearing cart:', error)
    return {
      success: false,
      message: 'Erro ao limpar carrinho',
    }
  }
}

/**
 * Get cart items
 */
export async function getCartAction(): Promise<CartItem[]> {
  return await getCartFromCookiesServer()
}
