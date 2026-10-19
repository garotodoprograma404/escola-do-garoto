// =====================================================
// CHECKOUT FORM - CLIENT COMPONENT
// =====================================================

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CreditCard, QrCode, Barcode, UserCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { useToast } from '@/shared/hooks/use-toast'
import { useCart } from '@/shared/context/CartContext'
import { processCheckoutAction } from '../actions/process-checkout'
import { checkoutSchema, type CheckoutSchema } from '../lib/validations'
import type { CartItem } from '@/shared/types/cart'
import { formatCurrency } from '@/shared/lib/utils'

interface CheckoutFormProps {
  items: CartItem[]
  discount: number
  total: number
  couponCode?: string
  initialBuyerData: {
    fullName: string
    email: string
  }
  paymentOptions: {
    pixEnabled: boolean
    creditCardEnabled: boolean
    boletoEnabled: boolean
    maxInstallments: number
    defaultInstallments: number
  }
}

export function CheckoutForm({
  items,
  discount: _discount,
  total,
  couponCode,
  initialBuyerData,
  paymentOptions,
}: CheckoutFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { clearCart } = useCart()
  const { toast } = useToast()

  const { handleSubmit, setValue, watch } = useForm<CheckoutSchema>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      payment_method: 'credit_card',
    },
  })

  const paymentMethod = watch('payment_method')
  const isBusy = isProcessing
  const enabledPaymentMethods = useMemo(() => {
    const methods: Array<CheckoutSchema['payment_method']> = []
    if (paymentOptions.creditCardEnabled) methods.push('credit_card')
    if (paymentOptions.pixEnabled) methods.push('pix')
    if (paymentOptions.boletoEnabled) methods.push('boleto')
    return methods
  }, [paymentOptions.boletoEnabled, paymentOptions.creditCardEnabled, paymentOptions.pixEnabled])
  const hasEnabledPaymentMethods = enabledPaymentMethods.length > 0

  useEffect(() => {
    if (!hasEnabledPaymentMethods) {
      return
    }

    if (!paymentMethod || !enabledPaymentMethods.includes(paymentMethod)) {
      setValue('payment_method', enabledPaymentMethods[0], {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [enabledPaymentMethods, hasEnabledPaymentMethods, paymentMethod, setValue])

  const paymentMethodLabel =
    paymentMethod === 'credit_card'
      ? 'Cartão'
      : paymentMethod === 'pix'
        ? 'PIX'
        : paymentMethod === 'boleto'
          ? 'Boleto'
          : 'Não selecionado'

  const onSubmit = async (data: CheckoutSchema) => {
    if (!hasEnabledPaymentMethods) {
      toast({
        title: 'Pagamento indisponível',
        description: 'Nenhum método de pagamento está habilitado no momento.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      const cartItems = items.map((item) => ({
        id: item.id,
        price: item.price,
      }))

      const result = await processCheckoutAction(
        {
          ...data,
          coupon_code: couponCode,
        },
        cartItems,
      )

      if (!result.success) {
        toast({
          title: 'Erro no checkout',
          description: result.message,
          variant: 'destructive',
        })
        return
      }

      if (result.should_clear_cart) {
        await clearCart()
      }

      toast({
        title: 'Tudo certo',
        description: result.message,
      })

      if (result.redirect_url) {
        window.location.assign(result.redirect_url)
      }
    } catch (error) {
      console.error('checkout form error:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar checkout. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="rounded-lg border bg-slate-50 p-4 text-sm dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-0.5 h-5 w-5 text-green-700 dark:text-green-400" />
            <div className="min-w-0">
              <p className="font-semibold">Compra vinculada à sua conta</p>
              <p className="truncate text-muted-foreground">
                {initialBuyerData.fullName || 'Aluno'} · {initialBuyerData.email}
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold">Método Preferido</h3>

        {!hasEnabledPaymentMethods && (
          <div className="rounded-lg border border-red-500/40 bg-red-50/70 p-4 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
            Nenhum método de pagamento está habilitado no momento.
          </div>
        )}

        <RadioGroup
          value={paymentMethod}
          onValueChange={(value) =>
            setValue('payment_method', value as CheckoutSchema['payment_method'], {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          disabled={isBusy}
        >
          {enabledPaymentMethods.map((method) => (
            <div key={method} className="flex items-center space-x-2 rounded-lg border p-4">
              <RadioGroupItem value={method} id={method} />
              <Label htmlFor={method} className="flex flex-1 cursor-pointer items-center gap-2">
                {method === 'credit_card' && <CreditCard className="h-5 w-5" />}
                {method === 'pix' && <QrCode className="h-5 w-5" />}
                {method === 'boleto' && <Barcode className="h-5 w-5" />}
                <span>
                  {method === 'credit_card'
                    ? 'Cartão de Crédito / Débito'
                    : method === 'pix'
                      ? 'PIX'
                      : 'Boleto Bancário'}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="rounded-lg border bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
          Você será redirecionado para o Checkout Pro do Mercado Pago para concluir o pagamento com
          segurança. Método selecionado: <strong>{paymentMethodLabel}</strong>.
          {paymentOptions.creditCardEnabled ? (
            <>
              {' '}
              Parcelamento disponível em até <strong>{paymentOptions.maxInstallments}x</strong>.
            </>
          ) : null}
          .
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isBusy}>
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparando pagamento...
            </>
          ) : (
            `Ir para pagamento - ${formatCurrency(total)}`
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pagamento seguro via Mercado Pago. Sua matrícula é liberada após confirmação do pagamento.
      </p>
    </form>
  )
}
