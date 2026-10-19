'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { QuestionFormData, QuestionFormErrors, QuizOption, QuestionType } from '../types'
import { QUESTION_TYPES, DEFAULT_QUESTION_POINTS, MIN_OPTIONS, MAX_OPTIONS } from '../constants'
import {
  OBJECTIVE_QUESTION_TYPES,
  areOptionsEqual,
  createDefaultOptions,
  ensureMinimumOptions,
  newOption,
  normalizeTrueFalseOptions,
  toggleCorrectOption,
  validateQuestion,
} from '../lib/question-options'
import { QuestionImageField, type ImageInputMode } from './QuestionImageField'
import { QuestionOptionsEditor } from './QuestionOptionsEditor'

interface QuestionFormProps {
  initialData?: QuestionFormData
  onSubmit: (data: QuestionFormData) => void
  onCancel: () => void
}

type QuestionFieldCopy = {
  questionPlaceholder: string
  questionHelp: string
  explanationPlaceholder: string
}

const QUESTION_FIELD_COPY: Record<QuestionType, QuestionFieldCopy> = {
  multiple_choice: {
    questionPlaceholder: 'Ex: Qual é o principal objetivo desta aula?',
    questionHelp: 'Use uma pergunta com apenas uma alternativa correta.',
    explanationPlaceholder: 'Explique por que a alternativa correta é a melhor resposta...',
  },
  multiple_answer: {
    questionPlaceholder: 'Ex: Quais itens fazem parte do conteúdo estudado?',
    questionHelp: 'Use quando houver mais de uma alternativa correta.',
    explanationPlaceholder: 'Explique por que as alternativas marcadas estão corretas...',
  },
  true_false: {
    questionPlaceholder: 'Ex: O conceito apresentado nesta aula está correto?',
    questionHelp: 'Escreva uma afirmação clara para o aluno marcar Verdadeiro ou Falso.',
    explanationPlaceholder: 'Explique por que a afirmação é verdadeira ou falsa...',
  },
}

export function QuestionForm({ initialData, onSubmit, onCancel }: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionFormData>(
    initialData || {
      type: 'multiple_choice',
      question_text: '',
      question_image_url: '',
      question_image_alt: '',
      explanation: '',
      points: DEFAULT_QUESTION_POINTS,
      options: createDefaultOptions(),
    },
  )
  const [errors, setErrors] = useState<QuestionFormErrors>({})
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>('upload')

  const needsOptions = OBJECTIVE_QUESTION_TYPES.includes(formData.type)
  const fieldCopy = QUESTION_FIELD_COPY[formData.type]

  useEffect(() => {
    if (!formData.question_image_url) {
      return
    }

    const isUploadedImageUrl = formData.question_image_url.startsWith('/api/files/public/')
    setImageInputMode(isUploadedImageUrl ? 'upload' : 'url')
  }, [formData.question_image_url])

  useEffect(() => {
    if (formData.type === 'true_false') {
      const normalizedOptions = normalizeTrueFalseOptions(formData.options)
      if (!areOptionsEqual(formData.options, normalizedOptions)) {
        setFormData((prev) => ({
          ...prev,
          options: normalizedOptions,
        }))
      }
      return
    }

    if (needsOptions && formData.options.length < MIN_OPTIONS) {
      setFormData((prev) => ({
        ...prev,
        options: ensureMinimumOptions(prev.options),
      }))
    }
  }, [formData.type, formData.options, needsOptions])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const validationErrors = validateQuestion(formData)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length === 0) {
      const normalizedQuestionImageUrl = formData.question_image_url.trim()
      const normalizedQuestionImageAlt = formData.question_image_alt.trim()
      const cleanedOptions = needsOptions
        ? formData.options
            .filter((opt) => opt.option_text.trim())
            .map((opt, idx) => ({ ...opt, order: idx }))
        : []
      onSubmit({
        ...formData,
        question_image_url: normalizedQuestionImageUrl,
        question_image_alt: normalizedQuestionImageUrl ? normalizedQuestionImageAlt : '',
        options: cleanedOptions,
      })
    }
  }

  const addOption = (): void => {
    setFormData((prev) =>
      prev.options.length < MAX_OPTIONS
        ? { ...prev, options: [...prev.options, newOption(prev.options.length)] }
        : prev,
    )
  }

  const removeOption = (id: string): void => {
    setFormData((prev) =>
      prev.options.length > MIN_OPTIONS
        ? { ...prev, options: prev.options.filter((opt) => opt.id !== id) }
        : prev,
    )
  }

  const updateOption = (id: string, updates: Partial<QuizOption>): void => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt)),
    }))
  }

  const toggleCorrect = (id: string): void => {
    setFormData((prev) => ({ ...prev, options: toggleCorrectOption(prev.type, prev.options, id) }))
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Questão</Label>
        <Select
          value={formData.type}
          onValueChange={(value: string) =>
            setFormData((prev) => ({ ...prev, type: value as QuestionType }))
          }
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Escolha o formato que melhor avalia o objetivo desta aula.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="question_text">
          Pergunta <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="question_text"
          value={formData.question_text}
          onChange={(e) => setFormData((prev) => ({ ...prev, question_text: e.target.value }))}
          placeholder={fieldCopy.questionPlaceholder}
          rows={3}
          className={errors.question_text ? 'border-destructive' : ''}
        />
        <p className="text-xs text-muted-foreground">{fieldCopy.questionHelp}</p>
        {errors.question_text && <p className="text-sm text-destructive">{errors.question_text}</p>}
      </div>

      <QuestionImageField
        imageUrl={formData.question_image_url}
        imageAlt={formData.question_image_alt}
        mode={imageInputMode}
        errors={errors}
        onModeChange={setImageInputMode}
        onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
        onUploadError={(message) => setErrors((prev) => ({ ...prev, question_image_url: message }))}
      />

      {needsOptions && (
        <QuestionOptionsEditor
          type={formData.type}
          options={formData.options}
          error={errors.options}
          onAdd={addOption}
          onRemove={removeOption}
          onUpdate={updateOption}
          onToggleCorrect={toggleCorrect}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="points">Pontuação da Questão</Label>
        <Input
          id="points"
          type="number"
          min={1}
          value={formData.points}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, points: parseInt(e.target.value) || 1 }))
          }
          className={errors.points ? 'border-destructive' : ''}
        />
        {errors.points && <p className="text-sm text-destructive">{errors.points}</p>}
        <p className="text-xs text-muted-foreground">Valor desta questão na nota final do quiz.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="explanation">Explicação (opcional)</Label>
        <Textarea
          id="explanation"
          value={formData.explanation}
          onChange={(e) => setFormData((prev) => ({ ...prev, explanation: e.target.value }))}
          placeholder={fieldCopy.explanationPlaceholder}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">Será mostrada após o aluno responder</p>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap justify-end gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{initialData ? 'Salvar Alterações' : 'Adicionar Questão'}</Button>
      </div>
    </form>
  )
}
