'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import { BasicInfoStep } from './steps/BasicInfoStep.client'
import { ContentStep } from './steps/ContentStep.client'
import { CurriculumStep } from './steps/CurriculumStep.client'
import { PricingStep } from './steps/PricingStep.client'
import { ReviewStep } from './steps/ReviewStep.client'
import { createCourseAction, saveDraftAction } from '../actions/create-course'
import { updateCourseAction } from '@/features/producer/courses/actions/update-course'
import { completeCourseSchema, type WizardStep, type CompleteCourseFormData } from '../types'
import { WIZARD_STEPS, buildCurriculumSignature, getStepValidationError } from '../lib/wizard'
import { WizardStepper } from './WizardStepper.client'

interface CourseWizardProps {
  mode?: 'create' | 'edit'
  courseId?: string
  initialData?: Partial<CompleteCourseFormData>
  platformCommissionRate?: number
}

export function CourseWizard({
  mode = 'create',
  courseId,
  initialData,
  platformCommissionRate,
}: CourseWizardProps = {}) {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Form data state - usa initialData se fornecido (edit), senão vazio (create)
  const [formData, setFormData] = useState<Partial<CompleteCourseFormData>>(
    initialData || {
      what_you_will_learn: [],
      requirements: [],
      target_audience: [],
      modules: [],
      is_free: false,
      price: 0,
      has_lifetime_access: true,
      has_certificate: true,
    },
  )
  const initialCurriculumSignatureRef = useRef<string>(
    buildCurriculumSignature(initialData?.modules),
  )

  const currentStepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1

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

  const handleStepClick = (stepId: WizardStep) => {
    setCurrentStep(stepId)
  }

  const handleUpdateData = (data: Partial<CompleteCourseFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)

    let result
    let currentCurriculumSignature: string | null = null

    if (mode === 'edit' && courseId) {
      currentCurriculumSignature = buildCurriculumSignature(
        (formData as CompleteCourseFormData).modules,
      )

      // Modo edit: atualizar curso existente
      result = await updateCourseAction(courseId, formData as CompleteCourseFormData, {
        skipCurriculumUpdate: currentCurriculumSignature === initialCurriculumSignatureRef.current,
      })
    } else {
      // Modo create: salvar rascunho
      result = await saveDraftAction(formData)
    }

    if (result.error || !result.success) {
      toast({
        title: 'Erro',
        description: result.error || 'Falha ao salvar',
        variant: 'destructive',
      })
    } else {
      if (mode === 'edit' && currentCurriculumSignature !== null) {
        initialCurriculumSignatureRef.current = currentCurriculumSignature
      }

      toast({
        title: mode === 'edit' ? 'Curso atualizado' : 'Rascunho salvo',
        description:
          mode === 'edit' ? 'Alterações salvas com sucesso' : 'Você pode continuar editando depois',
      })

      const createdCourseId = mode === 'create' && 'courseId' in result ? result.courseId : null

      if (mode === 'create' && createdCourseId) {
        router.push(`/producer/courses/${createdCourseId}/edit`)
      } else {
        router.push('/producer/courses')
      }
    }

    setIsSavingDraft(false)
  }

  const handleSubmit = async () => {
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

    let result
    let currentCurriculumSignature: string | null = null

    if (mode === 'edit' && courseId) {
      currentCurriculumSignature = buildCurriculumSignature(
        (formData as CompleteCourseFormData).modules,
      )

      // Modo edit: atualizar curso existente
      result = await updateCourseAction(courseId, formData as CompleteCourseFormData, {
        skipCurriculumUpdate: currentCurriculumSignature === initialCurriculumSignatureRef.current,
      })

      if (result.error || !result.success) {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao atualizar curso',
          variant: 'destructive',
        })
        setIsSubmitting(false)
      } else {
        if (currentCurriculumSignature !== null) {
          initialCurriculumSignatureRef.current = currentCurriculumSignature
        }

        toast({
          title: 'Sucesso',
          description: 'Curso atualizado com sucesso!',
        })
        router.push('/producer/courses')
      }
    } else {
      // Modo create: criar novo curso
      result = await createCourseAction(formData as CompleteCourseFormData)

      if (!result.success) {
        toast({
          title: 'Erro',
          description: result.error,
          variant: 'destructive',
        })
        setIsSubmitting(false)
      } else {
        toast({
          title: 'Sucesso',
          description: 'Curso criado com sucesso!',
        })
        router.push(`/producer/courses/${result.courseId}/edit`)
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <WizardStepper
        currentStep={currentStep}
        disabled={isSubmitting || isSavingDraft}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        {currentStep === 'basic' && <BasicInfoStep data={formData} onUpdate={handleUpdateData} />}
        {currentStep === 'content' && <ContentStep data={formData} onUpdate={handleUpdateData} />}
        {currentStep === 'curriculum' && (
          <CurriculumStep data={formData} onUpdate={handleUpdateData} onNext={handleNext} />
        )}
        {currentStep === 'pricing' && (
          <PricingStep
            data={formData}
            onUpdate={handleUpdateData}
            platformCommissionRate={platformCommissionRate}
          />
        )}
        {currentStep === 'review' && (
          <ReviewStep
            data={formData as CompleteCourseFormData}
            onSubmit={handleSubmit}
            mode={mode}
            platformCommissionRate={platformCommissionRate}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting || isSavingDraft}>
              <ArrowLeft size={16} className="mr-2" />
              Voltar
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleSaveDraft}
            disabled={isSubmitting || isSavingDraft}
          >
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
          <Button onClick={handleNext} disabled={isSubmitting || isSavingDraft}>
            Próximo
            <ArrowRight size={16} className="ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
