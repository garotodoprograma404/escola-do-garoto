// =====================================================
// CHECKOUT SUCCESS PAGE - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn, formatCurrency } from '@/shared/lib/utils'
import { getCurrentUser } from '@/lib/session'
import {
  lookupCheckoutOrder,
  lookupGuestCheckoutOrder,
  reconcileCheckoutOrderPaymentByPublicId,
} from '@/features/public/checkout/services/checkout-order-service'
import { ClearCartOnMount } from '@/features/public/checkout/components/ClearCartOnMount.client'
import { CheckoutStatusAutoRefresh } from '@/features/public/checkout/components/CheckoutStatusAutoRefresh.client'
import { getCheckoutAccountFinalizationState } from '@/features/public/checkout/lib/account-finalization'

export const metadata = {
  title: 'Status do Pagamento',
  description: 'Acompanhe o status do seu pedido',
}

interface SuccessPageProps {
  searchParams: Promise<{
    order_id?: string
  }>
}

function formatMoney(value: unknown): string {
  return formatCurrency(Number(value) || 0)
}

function getPaymentMethodLabel(value: unknown): string {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  if (normalized === 'credit_card') return 'Cartão de Crédito'
  if (normalized === 'pix') return 'PIX'
  if (normalized === 'boleto') return 'Boleto'
  if (normalized === 'checkout_pro') return 'Checkout Pro'
  if (normalized === 'free_coupon') return 'Gratuito (cupom)'

  return 'Não informado'
}

function statusPresentation(status: string) {
  if (status === 'approved' || status === 'free_completed') {
    return {
      icon: CheckCircle2,
      iconClass: 'text-green-700 dark:text-green-400',
      iconBgClass: 'bg-green-100 dark:bg-green-900',
      title: 'Compra realizada com sucesso!',
      description: 'Pagamento confirmado e acesso liberado aos seus cursos.',
      statusLabel: 'Aprovado',
      statusClass: 'text-green-700 dark:text-green-400',
      isApproved: true,
    }
  }

  if (status === 'pending' || status === 'in_process') {
    return {
      icon: Clock3,
      iconClass: 'text-amber-700 dark:text-amber-400',
      iconBgClass: 'bg-amber-100 dark:bg-amber-900',
      title: 'Pagamento em processamento',
      description: 'Seu pagamento foi recebido e está sendo analisado.',
      statusLabel: 'Pendente',
      statusClass: 'text-amber-700 dark:text-amber-400',
      isApproved: false,
    }
  }

  return {
    icon: XCircle,
    iconClass: 'text-red-700 dark:text-red-400',
    iconBgClass: 'bg-red-100 dark:bg-red-900',
    title: 'Pagamento não aprovado',
    description: 'Não foi possível concluir este pagamento.',
    statusLabel: 'Não aprovado',
    statusClass: 'text-red-700 dark:text-red-400',
    isApproved: false,
  }
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams

  if (!params.order_id) {
    redirect('/cart')
  }

  const user = await getCurrentUser()

  // O pedido é de quem comprou. Compra feita sem conta (pedido sem dono) a API entrega pelo id.
  let order = user ? (await lookupCheckoutOrder(params.order_id)).order : null
  if (!order) order = await lookupGuestCheckoutOrder(params.order_id)

  if (!order) {
    if (!user) {
      // Cookie vencido no caminho: a pessoa entra e volta para ver o pedido.
      const back = `/checkout/success?order_id=${encodeURIComponent(params.order_id)}`
      redirect(`/login?redirect=${encodeURIComponent(back)}`)
    }
    redirect('/cart')
  }

  const initialOrderStatus = String(order.status || 'pending')
  if (user && (initialOrderStatus === 'pending' || initialOrderStatus === 'in_process')) {
    await reconcileCheckoutOrderPaymentByPublicId(params.order_id)
    order = (await lookupCheckoutOrder(params.order_id)).order || order
  }

  const orderStatus = String(order.status || 'pending')
  const items = Array.isArray(order.checkout_order_items) ? order.checkout_order_items : []

  const presentation = statusPresentation(orderStatus)
  const Icon = presentation.icon

  const accountFinalizationState = getCheckoutAccountFinalizationState({
    metadata: order.metadata,
    status: orderStatus,
    hasAuthenticatedUser: Boolean(user),
  })

  if (accountFinalizationState.shouldFinalizeAccount) {
    redirect(`/checkout/finalizar-conta?order_id=${encodeURIComponent(params.order_id)}`)
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      {presentation.isApproved && <ClearCartOnMount />}
      <CheckoutStatusAutoRefresh status={orderStatus} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-card p-8 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${presentation.iconBgClass}`}
          >
            <Icon className={`h-10 w-10 ${presentation.iconClass}`} />
          </div>

          <h1 className="mt-6 text-3xl font-bold">{presentation.title}</h1>

          <p className="mt-2 text-muted-foreground">{presentation.description}</p>

          <div className="mt-8 rounded-lg border bg-slate-50 p-6 text-left dark:bg-slate-900">
            <h2 className="font-semibold">Detalhes do Pedido</h2>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID do Pedido:</span>
                <span className="font-mono">{String(order.public_id)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-semibold">{formatMoney(order.total_amount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Método:</span>
                <span>{getPaymentMethodLabel(order.requested_payment_method)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Cursos:</span>
                <span>
                  {items.length} curso{items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-semibold ${presentation.statusClass}`}>
                  {presentation.statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-sm font-semibold">Próximos passos</p>
            <ul className="space-y-2 text-left text-sm text-muted-foreground">
              {presentation.isApproved ? (
                <>
                  <li>Seu acesso foi liberado e já está disponível no painel do aluno.</li>
                  <li>
                    {user
                      ? 'Acesse seu painel para iniciar os estudos.'
                      : 'Se você já tem conta, faça login para acessar seus cursos.'}
                  </li>
                </>
              ) : (
                <>
                  <li>Estamos atualizando automaticamente até a confirmação do pagamento.</li>
                  <li>Se falhar, tente outro método de pagamento no checkout.</li>
                </>
              )}
            </ul>
          </div>

          <div className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {user ? (
              <Link
                href="/student"
                className={cn(buttonVariants({ size: 'lg' }), 'cursor-pointer')}
              >
                Ir para meu painel
              </Link>
            ) : (
              <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'cursor-pointer')}>
                Entrar na conta
              </Link>
            )}

            <Link
              href="/catalogo"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'cursor-pointer')}
            >
              Explorar cursos
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
