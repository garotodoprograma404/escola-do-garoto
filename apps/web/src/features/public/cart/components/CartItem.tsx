// =====================================================
// CART ITEM - SERVER COMPONENT
// =====================================================

import Image from 'next/image'
import Link from 'next/link'
import { RemoveFromCartButton } from './RemoveFromCartButton.client'
import type { CartItem as CartItemType } from '@/shared/types/cart'
import { formatCurrency } from '@/shared/lib/utils'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  return (
    <div className="flex gap-4 rounded-lg border bg-card p-4">
      {/* Thumbnail */}
      <Link
        href={`/courses/${item.slug}`}
        className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-md"
      >
        {item.thumbnail_url ? (
          <Image src={item.thumbnail_url} alt={item.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-slate-800">
            <span className="text-xs text-muted-foreground">Sem imagem</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <Link href={`/courses/${item.slug}`} className="font-semibold hover:underline">
            {item.title}
          </Link>
          <p className="text-sm text-muted-foreground">Por {item.producer_name}</p>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{formatCurrency(item.price)}</span>

          {/* Remove Button */}
          <RemoveFromCartButton itemId={item.id} itemTitle={item.title} />
        </div>
      </div>
    </div>
  )
}
