'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  normalizePlatformCommissionRate,
  normalizeProducerRateFromPlatformRate,
} from '@/shared/lib/commission'
import { getActiveCategoriesAction } from '../../actions/create-course'
import type { CompleteCourseFormData } from '../../types'
import { ListPreview } from '../review/ListPreview.client'
import { ReviewBasicInfo } from '../review/ReviewBasicInfo.client'
import { ReviewCurriculum } from '../review/ReviewCurriculum.client'
import { ReviewPricing } from '../review/ReviewPricing.client'
import { ReviewSection } from '../review/ReviewSection.client'

interface ReviewStepProps {
  data: CompleteCourseFormData
  onSubmit: () => Promise<void>
  mode?: 'create' | 'edit'
  platformCommissionRate?: number
}

export function ReviewStep({
  data,
  onSubmit,
  mode = 'create',
  platformCommissionRate,
}: ReviewStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const resolvedPlatformCommissionRate = normalizePlatformCommissionRate(platformCommissionRate)
  const producerCommissionRate = normalizeProducerRateFromPlatformRate(
    resolvedPlatformCommissionRate,
  )

  // Carrega as categorias para mostrar o nome da escolhida.
  useEffect(() => {
    void getActiveCategoriesAction().then(setCategories)
  }, [])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Revisão Final</h2>
        <p className="text-slate-600 dark:text-slate-400">
          {mode === 'edit'
            ? 'Revise as alterações antes de salvar'
            : 'Revise as informações antes de enviar o curso para revisão'}
        </p>
      </div>

      <ReviewBasicInfo data={data} categories={categories} />

      <ReviewSection
        title="Conteúdo"
        icon={<CheckCircle className="h-5 w-5" />}
        collapsible
        defaultExpanded={false}
      >
        <div className="space-y-6">
          <ListPreview
            items={data.what_you_will_learn || []}
            label="O que o aluno vai aprender"
            emptyMessage="Nenhum item de aprendizado adicionado"
            maxVisibleItems={5}
          />

          <ListPreview
            items={data.requirements || []}
            label="Requisitos"
            emptyMessage="Nenhum requisito adicionado"
            maxVisibleItems={5}
          />

          <ListPreview
            items={data.target_audience || []}
            label="Para quem é este curso"
            emptyMessage="Nenhum público-alvo definido"
            maxVisibleItems={5}
          />
        </div>
      </ReviewSection>

      <ReviewCurriculum modules={data.modules} />

      <ReviewPricing
        data={data}
        producerCommissionRate={producerCommissionRate}
        platformCommissionRate={resolvedPlatformCommissionRate}
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex gap-3">
          <CheckCircle className="shrink-0 text-emerald-700 dark:text-emerald-400" size={20} />
          <div>
            <h4 className="mb-1 font-bold text-slate-900 dark:text-slate-100">
              {mode === 'edit' ? 'Pronto para salvar?' : 'Pronto para criar?'}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {mode === 'edit'
                ? 'Suas alterações serão salvas e o curso será atualizado.'
                : 'Seu curso será criado como rascunho. Você poderá editá-lo e adicionar mais conteúdo antes de publicar.'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} size="lg" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              {mode === 'edit' ? 'Salvando...' : 'Criando Curso...'}
            </>
          ) : mode === 'edit' ? (
            'Salvar Alterações'
          ) : (
            'Criar Curso'
          )}
        </Button>
      </div>
    </div>
  )
}
