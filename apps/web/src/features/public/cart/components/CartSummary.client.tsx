// =====================================================
// CART SUMMARY - CLIENT COMPONENT
// =====================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { useToast } from '@/shared/hooks/use-toast'
import { applyCouponAction } from '../actions/apply-coupon'
import type { CartItem } from '@/shared/types/cart'
import { formatCurrency } from '@/shared/lib/utils'

interface CartSummaryProps {
  subtotal: number
  itemCount: number
  items: CartItem[]
}

export function CartSummary({ subtotal, itemCount, items }: CartSummaryProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [couponCode, setCouponCode] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)

  const total = subtotal - discount

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um código de cupom',
        variant: 'destructive',
      })
      return
    }

    setIsApplying(true)
    const result = await applyCouponAction(
      couponCode,
      items.map((item) => ({
        id: item.id,
        price: item.price,
      })),
    )
    setIsApplying(false)

    if (result.success && typeof result.discount === 'number') {
      setDiscount(result.discount)
      setAppliedCoupon(couponCode.trim().toUpperCase())
      toast({
        title: 'Sucesso',
        description: result.message,
      })
    } else {
      toast({
        title: 'Erro',
        description: result.message,
        variant: 'destructive',
      })
    }
  }

  const handleRemoveCoupon = () => {
    setDiscount(0)
    setAppliedCoupon(null)
    setCouponCode('')
    toast({
      title: 'Cupom removido',
      description: 'O cupom foi removido do carrinho',
    })
  }

  const handleCheckout = () => {
    // Pass coupon and discount to checkout via URL params
    const params = new URLSearchParams()
    if (appliedCoupon) {
      params.set('coupon', appliedCoupon)
    }

    const url = params.toString() ? `/checkout?${params.toString()}` : '/checkout'
    router.push(url)
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-xl font-bold">Resumo do Pedido</h2>

      <div className="mt-6 space-y-4">
        {/* Coupon Input */}
        <div className="space-y-2">
          <Label htmlFor="coupon">Cupom de Desconto</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="coupon"
              placeholder="Digite o código"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={!!appliedCoupon || isApplying}
            />
            {appliedCoupon ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveCoupon}
                disabled={isApplying}
                className="sm:w-auto"
              >
                Remover cupom
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleApplyCoupon}
                disabled={isApplying}
                className="sm:w-auto"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Aplicar cupom
                  </>
                )}
              </Button>
            )}
          </div>
          {appliedCoupon && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Cupom &quot;{appliedCoupon}&quot; aplicado com sucesso.</span>
            </div>
          )}
          {!appliedCoupon && (
            <p className="text-xs text-muted-foreground">
              Digite o código e clique em <strong>Aplicar cupom</strong>.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
          </span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
            <span>Desconto</span>
            <span>- {formatCurrency(discount)}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between border-t pt-4 text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>

        {/* Checkout Button */}
        <Button className="w-full" size="lg" onClick={handleCheckout} disabled={itemCount === 0}>
          Finalizar Compra
        </Button>

        {/* Security Info */}
        <p className="text-center text-xs text-muted-foreground">Pagamento 100% seguro</p>
      </div>
    </div>
  )
}
