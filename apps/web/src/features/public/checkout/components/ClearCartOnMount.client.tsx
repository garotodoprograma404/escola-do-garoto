'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '@/shared/context/CartContext'

export function ClearCartOnMount() {
  const { clearCart } = useCart()
  const hasClearedRef = useRef(false)

  useEffect(() => {
    if (hasClearedRef.current) {
      return
    }

    hasClearedRef.current = true
    void clearCart()
  }, [clearCart])

  return null
}
