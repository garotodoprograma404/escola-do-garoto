import { redirect } from 'next/navigation'

interface PendingPageProps {
  searchParams: Promise<{
    order_id?: string
  }>
}

export default async function CheckoutPendingRedirectPage({ searchParams }: PendingPageProps) {
  const params = await searchParams

  if (params.order_id) {
    redirect(`/checkout/success?order_id=${encodeURIComponent(params.order_id)}`)
  }

  redirect('/cart')
}
