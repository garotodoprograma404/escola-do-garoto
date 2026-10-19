'use client'

import { Check } from 'lucide-react'
import { Progress } from '@/shared/components/ui/progress'
import { WIZARD_STEPS } from '../lib/wizard'
import type { WizardStep } from '../types'

interface WizardStepperProps {
  currentStep: WizardStep
  /** Trava a navegação enquanto algo está sendo salvo. */
  disabled: boolean
  onStepClick: (step: WizardStep) => void
}

/** Barra de progresso e os círculos numerados das etapas do assistente. */
export function WizardStepper({ currentStep, disabled, onStepClick }: WizardStepperProps) {
  const currentStepIndex = WIZARD_STEPS.findIndex((step) => step.id === currentStep)
  const progressPercentage = ((currentStepIndex + 1) / WIZARD_STEPS.length) * 100

  return (
    <div className="mb-8 space-y-6">
      <div className="space-y-2">
        <Progress value={progressPercentage} className="h-2" />
        <p className="text-right text-xs text-slate-600 dark:text-slate-400">
          Etapa {currentStepIndex + 1} de {WIZARD_STEPS.length}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {WIZARD_STEPS.map((step, index) => {
          const isActive = step.id === currentStep
          const isCompleted = index < currentStepIndex

          return (
            <div key={step.id} className={`flex items-center ${index !== 0 ? 'flex-1' : ''}`}>
              {index !== 0 && (
                <div
                  className={`h-[2px] flex-1 transition-all duration-300 ${
                    isCompleted ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}

              <button
                type="button"
                onClick={() => !disabled && onStepClick(step.id)}
                disabled={disabled}
                className={`flex flex-col items-center gap-3 transition-all duration-200 ${
                  disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'
                }`}
              >
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isActive
                      ? 'scale-110 border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                      : isCompleted
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={20} className="duration-200 animate-in zoom-in" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                <span
                  className={`max-w-[120px] text-center text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : isCompleted
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
