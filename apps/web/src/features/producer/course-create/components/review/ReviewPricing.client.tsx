'use client'

import { CheckCircle, DollarSign, TrendingDown } from 'lucide-react'
import { calculateSavings, formatPrice } from '../../lib/helpers'
import type { CompleteCourseFormData } from '../../types'
import { ReviewField } from './ReviewField.client'
import { ReviewSection } from './ReviewSection.client'

function formatPercent(value: number): string {
  return value.toFixed(2).replace('.', ',')
}

function IncludedLabel({ included }: { included: boolean }) {
  return (
    <span
      className={
        included ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'
      }
    >
      {included ? 'Incluído' : 'Não incluído'}
    </span>
  )
}

interface PricePreviewProps {
  price: number
  discountPrice: number | null
  producerCommissionRate: number
  platformCommissionRate: number
}

/** "Como o aluno vê" o preço e quanto o produtor recebe por venda (com ou sem desconto). */
function PricePreview({
  price,
  discountPrice,
  producerCommissionRate,
  platformCommissionRate,
}: PricePreviewProps) {
  const finalPrice = discountPrice ?? price
  const savings = discountPrice ? calculateSavings(price, discountPrice) : null
  const producerEarnings = (finalPrice * producerCommissionRate) / 100

  return (
    <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
      <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
        Preview do Preço
      </p>
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-700/80 dark:bg-slate-900/60">
        <div className="space-y-4">
          {savings && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">De:</span>
              <span className="text-lg text-slate-600 line-through dark:text-slate-400">
                {formatPrice(price)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {savings ? 'Por:' : 'Preço:'}
            </span>
            <span className="text-3xl font-bold text-brand-700 dark:text-brand-300">
              {formatPrice(finalPrice)}
            </span>
          </div>

          {savings && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">Economia:</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {formatPrice(savings.amount)}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">
                  ({savings.percentage}% OFF)
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
            <span className="font-medium text-slate-700 dark:text-slate-300">Você receberá:</span>
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {formatPrice(producerEarnings)}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                por venda ({formatPercent(producerCommissionRate)}% - taxa{' '}
                {formatPercent(platformCommissionRate)}%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ReviewPricingProps {
  data: CompleteCourseFormData
  producerCommissionRate: number
  platformCommissionRate: number
}

/** Revisão do preço: curso gratuito ou valores, benefícios e quanto o produtor recebe. */
export function ReviewPricing({
  data,
  producerCommissionRate,
  platformCommissionRate,
}: ReviewPricingProps) {
  const discountPrice = data.discount_price && data.discount_price > 0 ? data.discount_price : null

  return (
    <ReviewSection
      title="Preço"
      icon={<DollarSign className="h-5 w-5" />}
      collapsible
      defaultExpanded={false}
    >
      {data.is_free ? (
        <div className="py-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-700 dark:text-green-400" />
          </div>
          <h4 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Curso Gratuito</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Este curso será disponibilizado gratuitamente para todos os alunos
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ReviewField
              label="Preço de Lista"
              value={
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formatPrice(data.price)}
                </span>
              }
            />

            {discountPrice && (
              <ReviewField
                label="Preço Promocional"
                value={
                  <span className="text-lg font-semibold text-green-700 dark:text-green-400">
                    {formatPrice(discountPrice)}
                  </span>
                }
              />
            )}

            <ReviewField
              label="Acesso Vitalício"
              value={<IncludedLabel included={data.has_lifetime_access} />}
            />

            <ReviewField
              label="Certificado de Conclusão"
              value={<IncludedLabel included={data.has_certificate} />}
            />
          </div>

          <PricePreview
            price={data.price}
            discountPrice={discountPrice}
            producerCommissionRate={producerCommissionRate}
            platformCommissionRate={platformCommissionRate}
          />
        </div>
      )}
    </ReviewSection>
  )
}
