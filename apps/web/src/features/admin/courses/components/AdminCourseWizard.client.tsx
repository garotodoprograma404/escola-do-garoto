'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import { WizardStepper } from '@/features/producer/course-create/components/WizardStepper.client'
import { BasicInfoStep } from '@/features/producer/course-create/components/steps/BasicInfoStep.client'
import { ContentStep } from '@/features/producer/course-create/components/steps/ContentStep.client'
import { CurriculumStep } from '@/features/producer/course-create/components/steps/CurriculumStep.client'
import { PricingStep } from '@/features/producer/course-create/components/steps/PricingStep.client'
import { ReviewStep } from '@/features/producer/course-create/components/steps/ReviewStep.client'
import {
  WIZARD_STEPS,
  buildCurriculumSignature,
  getStepValidationError,
} from '@/features/producer/course-create/lib/wizard'
import {
  completeCourseSchema,
  type CompleteCourseFormData,
  type WizardStep,
} from '@/features/producer/course-create/types'
import { createCompleteCourseByAdminAction } from '../actions/create-complete-course'
import { saveDraftCompleteCourseByAdminAction } from '../actions/save-draft-complete-course'
import { updateCompleteCourseByAdminAction } from '../actions/update-complete-course'
import { useActiveProducers } from '../hooks/useActiveProducers'
import { buildInitialSettings, toSettingsPayload, type AdminIdentity } from '../lib/courseSettings'
import type { AdminCourseEditorSettings } from '../types'
import { AdminCourseSettingsPanel } from './AdminCourseSettingsPanel.client'

interface AdminCourseWizardProps {
  mode?: 'create' | 'edit'
  courseId?: string
  initialData?: Partial<CompleteCourseFormData>
  initialSettings?: Partial<AdminCourseEditorSettings>
  adminIdentity: AdminIdentity
}

const EMPTY_COURSE: Partial<CompleteCourseFormData> = {
  what_you_will_learn: [],
  requirements: [],
  target_audience: [],
  modules: [],
  is_free: false,
  price: 0,
  has_lifetime_access: true,
  has_certificate: true,
}

export function AdminCourseWizard({
  mode = 'create',
  courseId,
  initialData,
  initialSettings,
  adminIdentity,
}: AdminCourseWizardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { producers, isLoading: isLoadingProducers } = useActiveProducers()
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [settings, setSettings] = useState<AdminCourseEditorSettings>(() =>
    buildInitialSettings(adminIdentity, initialSettings),
  )
  const [formData, setFormData] = useState<Partial<CompleteCourseFormData>>(
    initialData || EMPTY_COURSE,
  )
  const initialCurriculumSignatureRef = useRef<string>(
    buildCurriculumSignature(initialData?.modules),
  )

  const currentStepIndex = WIZARD_STEPS.findIndex((step) => step.id === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1
  const isBusy = isSubmitting || isSavingDraft
  const isEditing = mode === 'edit' && Boolean(courseId)

  const validateOwnershipSettings = (): boolean => {
    if (settings.ownerMode === 'producer' && !settings.producerId) {
      toast({
        title: 'Selecione um produtor',
        description: 'Escolha o produtor responsável antes de continuar.',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const handleNext = () => {
    const validationError = getStepValidationError(currentStep, formData)
    if (validationError) {
      toast({
        title: 'Revise os dados desta etapa',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    if (!isLastStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex + 1].id)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(WIZARD_STEPS[currentStepIndex - 1].id)
    }
  }

  const handleUpdateData = (data: Partial<CompleteCourseFormData>) => {
    setFormData((previous) => ({ ...previous, ...data }))
  }

  /** Edição: regrava o curso (e o currículo só se ele mudou). Devolve `true` se salvou. */
  const updateExistingCourse = async (errorTitle: string, fallbackError: string) => {
    const currentCurriculumSignature = buildCurriculumSignature(
      (formData as CompleteCourseFormData).modules,
    )

    const result = await updateCompleteCourseByAdminAction({
      courseId: courseId!,
      courseData: formData as CompleteCourseFormData,
      settings: toSettingsPayload(settings),
      options: {
        skipCurriculumUpdate: currentCurriculumSignature === initialCurriculumSignatureRef.current,
      },
    })

    if (!result.success) {
      toast({
        title: errorTitle,
        description: result.error || fallbackError,
        variant: 'destructive',
      })
      return false
    }

    initialCurriculumSignatureRef.current = currentCurriculumSignature
    return true
  }

  const handleSaveDraft = async () => {
    if (!validateOwnershipSettings()) return

    setIsSavingDraft(true)

    try {
      if (isEditing) {
        if (
          !(await updateExistingCourse('Erro ao salvar alterações', 'Falha ao salvar o curso.'))
        ) {
          return
        }

        toast({ title: 'Curso atualizado', description: 'Alterações salvas com sucesso.' })
        router.push('/admin/courses')
        return
      }

      const result = await saveDraftCompleteCourseByAdminAction({
        courseData: formData,
        settings: toSettingsPayload(settings),
      })

      if (!result.success || !result.courseId) {
        toast({
          title: 'Erro ao salvar rascunho',
          description: result.error || 'Falha ao salvar rascunho.',
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'Rascunho salvo', description: 'Você pode continuar editando o curso.' })
      router.push(`/admin/courses/${result.courseId}/edit`)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateOwnershipSettings()) return

    const completeValidation = completeCourseSchema.safeParse(formData)
    if (!completeValidation.success) {
      toast({
        title: 'Revise os dados antes de finalizar',
        description: completeValidation.error.errors[0]?.message || 'Dados do curso inválidos',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing) {
        if (!(await updateExistingCourse('Erro', 'Falha ao atualizar curso'))) return

        toast({ title: 'Curso atualizado', description: 'Curso atualizado com sucesso.' })
        router.push('/admin/courses')
        return
      }

      const result = await createCompleteCourseByAdminAction({
        courseData: formData as CompleteCourseFormData,
        settings: toSettingsPayload(settings),
      })

      if (!result.success || !result.courseId) {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao criar curso',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Curso criado',
        description: 'Curso criado com sucesso. Continue a edição se necessário.',
      })
      router.push(`/admin/courses/${result.courseId}/edit`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <AdminCourseSettingsPanel
        settings={settings}
        adminIdentity={adminIdentity}
        producers={producers}
        isLoadingProducers={isLoadingProducers}
        onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
      />

      <WizardStepper currentStep={currentStep} disabled={isBusy} onStepClick={setCurrentStep} />

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {currentStep === 'basic' && <BasicInfoStep data={formData} onUpdate={handleUpdateData} />}
        {currentStep === 'content' && <ContentStep data={formData} onUpdate={handleUpdateData} />}
        {currentStep === 'curriculum' && (
          <CurriculumStep data={formData} onUpdate={handleUpdateData} onNext={handleNext} />
        )}
        {currentStep === 'pricing' && <PricingStep data={formData} onUpdate={handleUpdateData} />}
        {currentStep === 'review' && (
          <ReviewStep
            data={formData as CompleteCourseFormData}
            onSubmit={handleSubmit}
            mode={mode}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" onClick={handleBack} disabled={isBusy}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
          )}
          <Button variant="ghost" onClick={handleSaveDraft} disabled={isBusy}>
            {isSavingDraft ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} className="mr-2" />
                {mode === 'edit' ? 'Salvar Alterações' : 'Salvar Rascunho'}
              </>
            )}
          </Button>
        </div>

        {!isLastStep && (
          <Button onClick={handleNext} disabled={isBusy}>
            Próximo
            <ArrowRight size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
