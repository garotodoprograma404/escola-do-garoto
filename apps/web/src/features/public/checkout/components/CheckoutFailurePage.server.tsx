import { redirect } from 'next/navigation'

interface FailurePageProps {
  searchParams: Promise<{
    order_id?: string
  }>
}

export default async function CheckoutFailureRedirectPage({ searchParams }: FailurePageProps) {
  const params = await searchParams

  if (params.order_id) {
    redirect(`/checkout/success?order_id=${encodeURIComponent(params.order_id)}`)
  }

  redirect('/cart')
}
