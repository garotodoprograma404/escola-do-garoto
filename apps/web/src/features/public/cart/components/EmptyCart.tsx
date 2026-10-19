// =====================================================
// EMPTY CART - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-slate-100 p-6 dark:bg-slate-800">
        <ShoppingCart className="h-12 w-12 text-slate-600 dark:text-slate-400" />
      </div>

      <h2 className="mt-6 text-2xl font-bold">Seu carrinho está vazio</h2>
      <p className="mt-2 text-muted-foreground">Adicione cursos ao carrinho para continuar</p>

      <Button asChild className="mt-6" size="lg">
        <Link href="/catalog">Explorar Cursos</Link>
      </Button>
    </div>
  )
}
