'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { ShoppingCart, Check, Loader2 } from 'lucide-react'
import { useCart } from '@/shared/context/CartContext'
import { useToast } from '@/shared/hooks/use-toast'

interface AddToCartButtonProps {
  courseId: string
  courseTitle: string
  courseSlug: string
  coursePrice: number
  courseThumbnail: string | null
  producerName: string
}

export function AddToCartButton({
  courseId,
  courseTitle,
  courseSlug,
  coursePrice,
  courseThumbnail,
  producerName,
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isAdded, setIsAdded] = useState(false)
  const { addToCart } = useCart()
  const { toast } = useToast()

  const handleAddToCart = async () => {
    setIsLoading(true)

    try {
      const result = await addToCart({
        id: courseId,
        title: courseTitle,
        slug: courseSlug,
        price: coursePrice,
        thumbnail_url: courseThumbnail,
        producer_name: producerName,
      })

      if (result.success) {
        setIsAdded(true)
        toast({
          title: '✅ Adicionado ao carrinho!',
          description: `${result.message} Vá para /cart para finalizar a compra.`,
        })

        setTimeout(() => {
          setIsAdded(false)
        }, 3000)
      } else {
        toast({
          title: 'Atenção',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar ao carrinho',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full border-2 font-bold"
      onClick={handleAddToCart}
      disabled={isLoading || isAdded}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Adicionando...
        </>
      ) : isAdded ? (
        <>
          <Check className="h-5 w-5" />
          Adicionado ao Carrinho
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" />
          Adicionar ao Carrinho
        </>
      )}
    </Button>
  )
}
