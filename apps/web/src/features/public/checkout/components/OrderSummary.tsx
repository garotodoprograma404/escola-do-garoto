// =====================================================
// ORDER SUMMARY - SERVER COMPONENT
// =====================================================

import Image from 'next/image'
import type { CartItem } from '@/shared/types/cart'
import { formatCurrency } from '@/shared/lib/utils'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  couponCode?: string
}

export function OrderSummary({ items, subtotal, discount, total, couponCode }: OrderSummaryProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-xl font-bold">Resumo do Pedido</h2>

      {/* Items */}
      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded">
              {item.thumbnail_url ? (
                <Image src={item.thumbnail_url} alt={item.title} fill className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-800">
                  <span className="text-xs text-muted-foreground">Sem imagem</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.producer_name}</p>
            </div>

            <div className="text-sm font-semibold">{formatCurrency(item.price)}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-6 border-t" />

      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {discount > 0 && (
          <>
            <div className="flex justify-between text-sm text-green-700 dark:text-green-400">
              <span>Desconto {couponCode && `(${couponCode})`}</span>
              <span>- {formatCurrency(discount)}</span>
            </div>
          </>
        )}

        <div className="border-t pt-2">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
        <p className="text-xs text-blue-900 dark:text-blue-100">
          O pagamento será concluído com segurança no Checkout Pro do Mercado Pago.
        </p>
      </div>
    </div>
  )
}
