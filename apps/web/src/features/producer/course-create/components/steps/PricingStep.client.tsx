'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { pricingSchema, type PricingFormData, type CompleteCourseFormData } from '../../types'
import {
  normalizePlatformCommissionRate,
  normalizeProducerRateFromPlatformRate,
} from '@/shared/lib/commission'
import { useStableCallback } from '@/shared/hooks/useStableCallback'
import { formatCurrency } from '@/shared/lib/utils'

interface PricingStepProps {
  data: Partial<CompleteCourseFormData>
  onUpdate: (data: Partial<CompleteCourseFormData>) => void
  platformCommissionRate?: number
}

function formatPercent(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

export function PricingStep({ data, onUpdate, platformCommissionRate }: PricingStepProps) {
  const updateParent = useStableCallback(onUpdate)
  const resolvedPlatformCommissionRate = normalizePlatformCommissionRate(platformCommissionRate)
  const producerCommissionRate = normalizeProducerRateFromPlatformRate(
    resolvedPlatformCommissionRate,
  )

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      price: data.price || 0,
      is_free: data.is_free || false,
      discount_price: data.discount_price || null,
      has_lifetime_access: data.has_lifetime_access ?? true,
      has_certificate: data.has_certificate ?? true,
    },
  })

  const isFree = watch('is_free')
  const discountPrice = watch('discount_price')
  const currentPrice = watch('price')
  const hasLifetimeAccess = watch('has_lifetime_access')
  const hasCertificate = watch('has_certificate')

  useEffect(() => {
    updateParent({
      price: currentPrice ?? 0,
      is_free: isFree ?? false,
      discount_price: discountPrice ?? null,
      has_lifetime_access: hasLifetimeAccess ?? true,
      has_certificate: hasCertificate ?? true,
    })
  }, [currentPrice, isFree, discountPrice, hasLifetimeAccess, hasCertificate, updateParent])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Preço do Curso</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Defina o valor do seu curso ou disponibilize gratuitamente
        </p>
      </div>

      {/* Is Free */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_free"
          checked={isFree}
          onCheckedChange={(checked) => {
            setValue('is_free', checked as boolean, {
              shouldDirty: true,
              shouldValidate: true,
            })
            if (checked) {
              setValue('price', 0, {
                shouldDirty: true,
                shouldValidate: true,
              })
              setValue('discount_price', null, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          }}
        />
        <Label htmlFor="is_free" className="cursor-pointer">
          Este curso é gratuito
        </Label>
      </div>

      {/* Price */}
      {!isFree && (
        <>
          <div>
            <Label htmlFor="price">
              Preço de Lista (R$) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="9.90"
              {...register('price', { valueAsNumber: true })}
              placeholder="497.00"
              className="mt-1"
            />
            {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Este é o preço &quot;oficial&quot; do seu curso
            </p>
          </div>

          {/* Offer Discount */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="offer_discount"
              checked={discountPrice !== null && discountPrice !== undefined}
              onCheckedChange={(checked) => {
                if (checked) {
                  setValue('discount_price', 0, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                } else {
                  setValue('discount_price', null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              }}
            />
            <Label htmlFor="offer_discount" className="cursor-pointer">
              Oferecer preço promocional
            </Label>
          </div>

          {/* Discount Price */}
          {discountPrice !== null && discountPrice !== undefined && (
            <div>
              <Label htmlFor="discount_price">
                Preço Promocional (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="discount_price"
                type="number"
                step="0.01"
                min="9.90"
                {...register('discount_price', {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === '' ? null : v),
                })}
                placeholder="97.00"
                className="mt-1"
              />
              {errors.discount_price && (
                <p className="mt-1 text-sm text-red-500">{errors.discount_price.message}</p>
              )}
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Preço com desconto que o aluno pagará
              </p>
            </div>
          )}

          {/* Price Preview */}
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700/80 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <span className="text-lg text-slate-700 dark:text-slate-300">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Preview do Preço
              </h3>
            </div>

            {(() => {
              const currentPrice = watch('price') || 0
              const currentDiscount = watch('discount_price')
              const finalPrice =
                currentDiscount !== null && currentDiscount !== undefined
                  ? currentDiscount
                  : currentPrice
              const savings =
                currentDiscount !== null && currentDiscount !== undefined && currentPrice > 0
                  ? currentPrice - currentDiscount
                  : 0
              const savingsPercent =
                currentPrice > 0 && savings > 0 ? Math.round((savings / currentPrice) * 100) : 0
              const producerEarnings = (finalPrice * producerCommissionRate) / 100

              return (
                <div className="space-y-3">
                  {currentDiscount !== null &&
                    currentDiscount !== undefined &&
                    currentPrice > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-400">De:</span>
                          <span className="text-lg text-slate-600 line-through dark:text-slate-500">
                            {formatCurrency(currentPrice)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Por:
                          </span>
                          <span className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                            {formatCurrency(currentDiscount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                          <span className="text-slate-600 dark:text-slate-400">Economia:</span>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                              {formatCurrency(savings)}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-400">
                              ({savingsPercent}% OFF)
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  {(currentDiscount === null || currentDiscount === undefined) &&
                    currentPrice > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          Preço:
                        </span>
                        <span className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                          {formatCurrency(currentPrice)}
                        </span>
                      </div>
                    )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Você receberá:
                    </span>
                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(producerEarnings)}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        por venda ({formatPercent(producerCommissionRate)}% - taxa{' '}
                        {formatPercent(resolvedPlatformCommissionRate)}%)
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Pricing Tips */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <h4 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">
                  Dicas de Preço
                </h4>
                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <li>
                    • <strong>Iniciante:</strong> R$ 97 - R$ 197
                  </li>
                  <li>
                    • <strong>Intermediário:</strong> R$ 197 - R$ 397
                  </li>
                  <li>
                    • <strong>Avançado:</strong> R$ 397 - R$ 997
                  </li>
                </ul>
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                  💡 Dica: Preços terminados em 7 ou 9 (ex: R$ 97, R$ 197) tendem a converter
                  melhor!
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Benefícios inclusos no curso
        </h4>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_lifetime_access"
            checked={hasLifetimeAccess}
            onCheckedChange={(checked) =>
              setValue('has_lifetime_access', checked === true, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <Label htmlFor="has_lifetime_access" className="cursor-pointer">
            Acesso vitalício
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has_certificate"
            checked={hasCertificate}
            onCheckedChange={(checked) =>
              setValue('has_certificate', checked === true, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <Label htmlFor="has_certificate" className="cursor-pointer">
            Certificado de conclusão
          </Label>
        </div>
      </div>
    </div>
  )
}
