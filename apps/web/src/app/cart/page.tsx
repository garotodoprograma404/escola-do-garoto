// =====================================================
// CART PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { getCartFromCookiesServer } from '@/shared/lib/cart-cookie'
import { CartItem, CartSummary, EmptyCart, refreshCartItems } from '@/features/public/cart'

export const metadata = {
  title: 'Carrinho de Compras',
  description: 'Revise seus cursos e finalize sua compra',
}

async function CartContent() {
  // O cookie do carrinho é editável pelo navegador: preço e disponibilidade vêm do banco.
  const items = await refreshCartItems(await getCartFromCookiesServer())

  if (items.length === 0) {
    return <EmptyCart />
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            Carrinho ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </h2>

          {items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-4">
          <CartSummary subtotal={subtotal} itemCount={items.length} items={items} />
        </div>
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <PublicLayout>
      <main className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/catalogo">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Continuar Comprando
              </Link>
            </Button>

            <h1 className="text-3xl font-bold">Carrinho de Compras</h1>
          </div>

          {/* Content */}
          <Suspense
            fallback={
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32" />
                  ))}
                </div>
                <div className="lg:col-span-1">
                  <Skeleton className="h-96" />
                </div>
              </div>
            }
          >
            <CartContent />
          </Suspense>
        </div>
      </main>
    </PublicLayout>
  )
}
