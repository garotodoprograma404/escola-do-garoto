'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X, Target, ClipboardList, Users, CheckCircle2 } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { contentSchema, type ContentFormData, type CompleteCourseFormData } from '../../types'
import { useStableCallback } from '@/shared/hooks/useStableCallback'

interface ContentStepProps {
  data: Partial<CompleteCourseFormData>
  onUpdate: (data: Partial<CompleteCourseFormData>) => void
}

export function ContentStep({ data, onUpdate }: ContentStepProps) {
  const updateParent = useStableCallback(onUpdate)
  const [whatYouWillLearn, setWhatYouWillLearn] = useState<string[]>(data.what_you_will_learn || [])
  const [requirements, setRequirements] = useState<string[]>(data.requirements || [])
  const [targetAudience, setTargetAudience] = useState<string[]>(data.target_audience || [])

  const [newLearnItem, setNewLearnItem] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newAudience, setNewAudience] = useState('')

  const {
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
  })

  useEffect(() => {
    const formData: ContentFormData = {
      what_you_will_learn: whatYouWillLearn,
      requirements,
      target_audience: targetAudience,
    }

    updateParent(formData)
    clearErrors()

    const validation = contentSchema.safeParse(formData)
    if (!validation.success) {
      for (const issue of validation.error.errors) {
        const field = issue.path[0]
        if (
          field === 'what_you_will_learn' ||
          field === 'requirements' ||
          field === 'target_audience'
        ) {
          setError(field, { type: 'manual', message: issue.message })
        }
      }
    }
  }, [whatYouWillLearn, requirements, targetAudience, updateParent, clearErrors, setError])

  const addLearnItem = () => {
    if (newLearnItem.trim()) {
      setWhatYouWillLearn([...whatYouWillLearn, newLearnItem.trim()])
      setNewLearnItem('')
      clearErrors('what_you_will_learn')
    }
  }

  const removeLearnItem = (index: number) => {
    setWhatYouWillLearn(whatYouWillLearn.filter((_, i) => i !== index))
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setRequirements([...requirements, newRequirement.trim()])
      setNewRequirement('')
      clearErrors('requirements')
    }
  }

  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index))
  }

  const addAudience = () => {
    if (newAudience.trim()) {
      setTargetAudience([...targetAudience, newAudience.trim()])
      setNewAudience('')
      clearErrors('target_audience')
    }
  }

  const removeAudience = (index: number) => {
    setTargetAudience(targetAudience.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
          Conteúdo do Curso
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Defina o que o aluno vai aprender e os requisitos
        </p>
      </div>

      {/* What You Will Learn */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-500" />
              <Label className="text-base font-semibold">
                O que o aluno vai aprender <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Mínimo 3 itens • {whatYouWillLearn.length}/3
              </span>
              {whatYouWillLearn.length >= 3 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newLearnItem}
              onChange={(e) => setNewLearnItem(e.target.value)}
              placeholder="Ex: Dominar React e TypeScript do zero ao avançado"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLearnItem())}
              className="flex-1"
            />
            <Button type="button" onClick={addLearnItem} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {whatYouWillLearn.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {whatYouWillLearn.map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="group py-1.5 pl-3 pr-1 text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <span className="mr-2">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeLearnItem(index)}
                    className="ml-1 rounded-sm p-0.5 opacity-70 transition-all hover:bg-slate-300 hover:opacity-100 dark:hover:bg-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {errors.what_you_will_learn && (
            <p className="text-sm text-red-500">{errors.what_you_will_learn.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand-500" />
              <Label className="text-base font-semibold">
                Requisitos <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Mínimo 1 item • {requirements.length}/1
              </span>
              {requirements.length >= 1 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              placeholder="Ex: Computador com acesso à internet e vontade de aprender"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              className="flex-1"
            />
            <Button type="button" onClick={addRequirement} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {requirements.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {requirements.map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="group py-1.5 pl-3 pr-1 text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <span className="mr-2">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="ml-1 rounded-sm p-0.5 opacity-70 transition-all hover:bg-slate-300 hover:opacity-100 dark:hover:bg-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {errors.requirements && (
            <p className="text-sm text-red-500">{errors.requirements.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-500" />
              <Label className="text-base font-semibold">
                Para quem é este curso <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                Mínimo 1 item • {targetAudience.length}/1
              </span>
              {targetAudience.length >= 1 && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newAudience}
              onChange={(e) => setNewAudience(e.target.value)}
              placeholder="Ex: Desenvolvedores que querem migrar para React"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAudience())}
              className="flex-1"
            />
            <Button type="button" onClick={addAudience} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" />
              Adicionar
            </Button>
          </div>

          {targetAudience.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {targetAudience.map((item, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="group py-1.5 pl-3 pr-1 text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <span className="mr-2">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeAudience(index)}
                    className="ml-1 rounded-sm p-0.5 opacity-70 transition-all hover:bg-slate-300 hover:opacity-100 dark:hover:bg-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {errors.target_audience && (
            <p className="text-sm text-red-500">{errors.target_audience.message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
