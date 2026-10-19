import { notFound, redirect } from 'next/navigation'
import { lookupCheckoutOrder } from '@/features/public/checkout/services/checkout-order-service'
import { CheckoutSimulator } from '@/features/public/checkout/components/CheckoutSimulator.client'

export const metadata = {
  title: 'Simulador de pagamento',
  robots: { index: false, follow: false },
}

interface SimulatorPageProps {
  searchParams: Promise<{ pedido?: string }>
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Simulador de pagamento: só existe com o driver `fake` na API (que ela só aceita em produção no
 * ambiente de demonstração, `DEMO_MODE`). Num build de produção do Next a tela só abre se
 * `PAYMENT_SIMULATOR=true` estiver ligado no servidor: testes e ambiente de demonstração.
 */
export default async function CheckoutSimulatorPage({ searchParams }: SimulatorPageProps) {
  if (process.env.NODE_ENV === 'production' && process.env.PAYMENT_SIMULATOR !== 'true') notFound()

  const { pedido } = await searchParams
  if (!pedido) redirect('/cart')

  const { order, unauthenticated } = await lookupCheckoutOrder(pedido)
  if (unauthenticated) {
    redirect(`/login?redirect=${encodeURIComponent(`/checkout/simulador?pedido=${pedido}`)}`)
  }
  if (!order) redirect('/cart')

  return (
    <main className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-lg border bg-card p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Pagamento simulado: nada é cobrado
          </p>
          <h1 className="mt-2 text-2xl font-bold">Simulador de pagamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha o que o Mercado Pago responderia. O resultado passa pelas mesmas conferências do
            webhook de verdade.
          </p>

          <div className="mt-6 rounded-lg border bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <p className="font-mono text-xs">{order.public_id}</p>
            <ul className="mt-3 space-y-1">
              {order.checkout_order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>{item.course_title}</span>
                  <span>{brl.format(item.final_price)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <span>Total</span>
              <span>{brl.format(order.total_amount)}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Situação: {order.status}</p>
          </div>

          <div className="mt-6">
            <CheckoutSimulator orderId={order.public_id} />
          </div>
        </div>
      </div>
    </main>
  )
}
