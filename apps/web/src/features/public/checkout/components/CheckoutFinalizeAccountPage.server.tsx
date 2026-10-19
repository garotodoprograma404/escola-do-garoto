import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, Clock3, LockKeyhole, XCircle } from 'lucide-react'
import { buttonVariants } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { getCurrentUser } from '@/lib/session'
import { lookupGuestCheckoutOrder } from '@/features/public/checkout/services/checkout-order-service'
import { FinalizeAccountForm } from '@/features/public/checkout/components/FinalizeAccountForm.client'
import {
  asCheckoutMetadata,
  getCheckoutAccountFinalizationState,
} from '@/features/public/checkout/lib/account-finalization'

export const metadata = {
  title: 'Finalizar Conta',
  description: 'Defina sua senha para acessar os cursos comprados',
}

interface FinalizeAccountPageProps {
  searchParams: Promise<{
    order_id?: string
  }>
}

function getStatusRedirectPath(orderId: string): string {
  return `/checkout/success?order_id=${encodeURIComponent(orderId)}`
}

function normalizeStatus(value: unknown): string {
  return String(value || 'pending')
    .trim()
    .toLowerCase()
}

export default async function CheckoutFinalizeAccountPage({
  searchParams,
}: FinalizeAccountPageProps) {
  const params = await searchParams
  const orderId = String(params.order_id || '').trim()

  if (!orderId) {
    redirect('/cart')
  }

  // Quem já está logado não tem o que finalizar: vai para o painel.
  const user = await getCurrentUser()

  if (user) {
    redirect('/student')
  }

  // Só pedidos SEM dono (compra sem conta) chegam aqui; o id do pedido é a credencial.
  const order = await lookupGuestCheckoutOrder(orderId)

  if (!order) {
    redirect('/cart')
  }

  const orderStatus = normalizeStatus(order.status)

  // Ainda sem aprovação (ou não aprovado): a tela de status acompanha e explica.
  if (orderStatus !== 'approved' && orderStatus !== 'free_completed') {
    redirect(getStatusRedirectPath(orderId))
  }

  const accountFinalizationState = getCheckoutAccountFinalizationState({
    metadata: order.metadata,
    status: orderStatus,
    hasAuthenticatedUser: false,
  })

  if (!accountFinalizationState.shouldFinalizeAccount) {
    const metadataRecord = asCheckoutMetadata(order.metadata)

    if (accountFinalizationState.passwordAlreadyDefined) {
      redirect('/login')
    }

    if (metadataRecord.account_created_after_payment !== true) {
      redirect('/login')
    }

    redirect(getStatusRedirectPath(orderId))
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border bg-card p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-700 dark:text-green-400" />
            </div>

            <h1 className="mt-6 text-3xl font-bold">Pagamento aprovado</h1>
            <p className="mt-2 text-muted-foreground">
              Falta apenas definir sua senha para acessar a plataforma.
            </p>
          </div>

          <div className="mt-8 grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-700 dark:text-green-400" />
              <span>Seu pagamento foi confirmado.</span>
            </div>
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span>Defina uma senha para entrar com seguranca.</span>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Depois da confirmação, você será levado ao painel do aluno.</span>
            </div>
          </div>

          <FinalizeAccountForm
            orderId={String(order.public_id)}
            buyerEmail={String(order.buyer_email || '')}
            buyerName={String(order.buyer_full_name || 'Aluno')}
          />

          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-50/70 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Esta etapa só fica disponível para pedidos aprovados. Se você já tinha conta antes
                da compra, use o login ou a recuperacao de senha.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'cursor-pointer')}
            >
              Entrar em uma conta existente
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
