// =====================================================
// REMOVE FROM CART BUTTON - CLIENT COMPONENT
// =====================================================

'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useCart } from '@/shared/context/CartContext'
import { useToast } from '@/shared/hooks/use-toast'

interface RemoveFromCartButtonProps {
  itemId: string
  itemTitle: string
}

export function RemoveFromCartButton({ itemId, itemTitle }: RemoveFromCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { removeFromCart } = useCart()
  const { toast } = useToast()

  const handleRemove = async () => {
    setIsLoading(true)
    const result = await removeFromCart(itemId)
    setIsLoading(false)

    toast({
      title: result.success ? 'Sucesso' : 'Erro',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={isLoading}
      aria-label={`Remover ${itemTitle} do carrinho`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
