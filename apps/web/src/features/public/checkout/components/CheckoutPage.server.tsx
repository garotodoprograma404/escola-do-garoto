// =====================================================
// CHECKOUT PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CheckoutForm, OrderSummary } from '@/features/public/checkout'
import { applyCouponAction } from '@/features/public/cart/actions/apply-coupon'
import { getCurrentUser } from '@/lib/session'
import { apiServer } from '@/lib/server-api'
import { getCartFromCookiesServer } from '@/shared/lib/cart-cookie'

export const metadata = {
  title: 'Finalizar Compra',
  description: 'Complete sua compra de forma segura',
}

interface CheckoutPageProps {
  searchParams: Promise<{
    coupon?: string
  }>
}

interface CheckoutInitialBuyerData {
  fullName: string
  email: string
}

interface PaymentOptions {
  pixEnabled: boolean
  creditCardEnabled: boolean
  boletoEnabled: boolean
  maxInstallments: number
  defaultInstallments: number
}

// Padrões usados se a API de configurações não responder.
const DEFAULT_PAYMENT_OPTIONS: PaymentOptions = {
  pixEnabled: true,
  creditCardEnabled: true,
  boletoEnabled: false,
  maxInstallments: 12,
  defaultInstallments: 1,
}

async function getPaymentOptions(): Promise<PaymentOptions> {
  const result = await apiServer<PaymentOptions>('/checkout/payment-options')
  return result.ok ? result.data : DEFAULT_PAYMENT_OPTIONS
}

function buildCheckoutRedirectPath(couponCode?: string): string {
  if (!couponCode) {
    return '/checkout'
  }

  const params = new URLSearchParams({ coupon: couponCode })
  return `/checkout?${params.toString()}`
}

async function CheckoutContent({ searchParams }: CheckoutPageProps) {
  const items = await getCartFromCookiesServer()
  const resolvedSearchParams = await searchParams

  if (items.length === 0) {
    redirect('/cart')
  }

  const couponCode = resolvedSearchParams.coupon?.trim().toUpperCase()
  const user = await getCurrentUser()

  if (!user) {
    const checkoutPath = buildCheckoutRedirectPath(couponCode)
    redirect(`/register?redirect=${encodeURIComponent(checkoutPath)}`)
  }

  const initialBuyerData: CheckoutInitialBuyerData = {
    fullName: String(user.name || '').trim(),
    email: String(user.email || '')
      .trim()
      .toLowerCase(),
  }

  const subtotal = items.reduce((sum, item) => sum + item.price, 0)
  let appliedCouponCode: string | undefined
  let discount = 0

  if (couponCode) {
    const couponResult = await applyCouponAction(
      couponCode,
      items.map((item) => ({
        id: item.id,
        price: item.price,
      })),
    )

    if (couponResult.success && typeof couponResult.discount === 'number') {
      discount = couponResult.discount
      appliedCouponCode = couponCode
    }
  }

  const total = Math.max(0, subtotal - discount)
  const paymentOptions = await getPaymentOptions()

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CheckoutForm
          items={items}
          discount={discount}
          total={total}
          couponCode={appliedCouponCode}
          initialBuyerData={initialBuyerData}
          paymentOptions={paymentOptions}
        />
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-4">
          <OrderSummary
            items={items}
            subtotal={subtotal}
            discount={discount}
            total={total}
            couponCode={appliedCouponCode}
          />
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage({ searchParams }: CheckoutPageProps) {
  return (
    <main className="min-h-screen bg-slate-50 py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/cart">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar ao Carrinho
            </Link>
          </Button>

          <h1 className="text-3xl font-bold">Finalizar Compra</h1>
          <p className="mt-2 text-muted-foreground">
            Complete suas informações para finalizar a compra
          </p>
        </div>

        <Suspense
          fallback={
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Skeleton className="h-96" />
                <Skeleton className="h-64" />
              </div>
              <div className="lg:col-span-1">
                <Skeleton className="h-96" />
              </div>
            </div>
          }
        >
          <CheckoutContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  )
}
