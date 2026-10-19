'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Zap, Loader2 } from 'lucide-react'
import { useCart } from '@/shared/context/CartContext'
import { useToast } from '@/shared/hooks/use-toast'

interface BuyNowButtonProps {
  courseId: string
  courseTitle: string
  courseSlug: string
  coursePrice: number
  courseThumbnail: string | null
  producerName: string
}

export function BuyNowButton({
  courseId,
  courseTitle,
  courseSlug,
  coursePrice,
  courseThumbnail,
  producerName,
}: BuyNowButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { addToCart } = useCart()
  const { toast } = useToast()

  const handleBuyNow = async () => {
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

      const isAlreadyInCart = result.message.toLowerCase().includes('já está no carrinho')

      if (!result.success && !isAlreadyInCart) {
        toast({
          title: 'Erro',
          description: result.message || 'Erro ao processar compra',
          variant: 'destructive',
        })
        return
      }

      router.push('/cart')
    } catch (error) {
      console.error('Erro ao processar compra:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao processar compra',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button size="lg" className="w-full font-bold" onClick={handleBuyNow} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Processando...
        </>
      ) : (
        <>
          <Zap className="h-5 w-5" />
          Comprar Agora
        </>
      )}
    </Button>
  )
}
