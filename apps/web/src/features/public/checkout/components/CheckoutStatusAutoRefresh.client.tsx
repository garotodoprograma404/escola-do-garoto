'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface CheckoutStatusAutoRefreshProps {
  status: string
}

export function CheckoutStatusAutoRefresh({ status }: CheckoutStatusAutoRefreshProps) {
  const router = useRouter()

  useEffect(() => {
    const normalizedStatus = String(status || '')
      .trim()
      .toLowerCase()
    const shouldPoll = normalizedStatus === 'pending' || normalizedStatus === 'in_process'

    if (!shouldPoll) {
      return
    }

    const intervalId = window.setInterval(() => {
      router.refresh()
    }, 5000)

    const timeoutId = window.setTimeout(
      () => {
        window.clearInterval(intervalId)
      },
      5 * 60 * 1000,
    )

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [router, status])

  return null
}
