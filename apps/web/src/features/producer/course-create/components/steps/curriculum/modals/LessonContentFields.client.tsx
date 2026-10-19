'use client'

import { useEffect, useState } from 'react'
import { FileUpload } from '@/shared/components/FileUpload.client'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RichTextEditor } from '@/shared/components/RichTextEditor.client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { QuizBuilder } from '../quiz'
import type { LessonFormData } from '../types'
import { areQuizQuestionsEqual, areQuizSettingsEqual } from './lesson-quiz-equality'

const EMPTY_QUIZ_QUESTIONS: NonNullable<LessonFormData['quiz_questions']> = []
const UPLOADED_DOCUMENT_PREFIX = '/api/files/public/documents/'

interface LessonContentFieldsProps {
  isOpen: boolean
  form: LessonFormData
  errors: Partial<Record<keyof LessonFormData, string>>
  onFormChange: (form: LessonFormData) => void
}

const hintClass = 'text-xs text-slate-600 dark:text-slate-400'

/** Campos que dependem do tipo da aula: link do vídeo, arquivo, texto ou o construtor de quiz. */
export function LessonContentFields({
  isOpen,
  form,
  errors,
  onFormChange,
}: LessonContentFieldsProps) {
  const [fileInputMode, setFileInputMode] = useState<'upload' | 'url'>('upload')

  // Ao abrir uma aula de arquivo, a aba certa: "upload" se o arquivo foi enviado aqui, senão "url".
  useEffect(() => {
    if (!isOpen || form.type !== 'file') return

    if (!form.content_url.trim()) {
      setFileInputMode('upload')
      return
    }

    setFileInputMode(form.content_url.startsWith(UPLOADED_DOCUMENT_PREFIX) ? 'upload' : 'url')
  }, [isOpen, form.type, form.content_url])

  if (form.type === 'video') {
    return (
      <div className="space-y-2">
        <Label htmlFor="lesson-content-url">
          URL do Vídeo <span className="text-red-500">*</span>
        </Label>
        <Input
          id="lesson-content-url"
          type="url"
          value={form.content_url}
          onChange={(event) => onFormChange({ ...form, content_url: event.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          className={errors.content_url ? 'border-red-500' : ''}
        />
        {errors.content_url && <p className="text-sm text-red-500">{errors.content_url}</p>}
        <p className={hintClass}>
          Cole um link público do YouTube, Vimeo ou outro serviço de vídeo
        </p>
      </div>
    )
  }

  if (form.type === 'file') {
    return (
      <div className="space-y-2">
        <Label>
          Arquivo da Aula <span className="text-red-500">*</span>
        </Label>
        <Tabs
          value={fileInputMode}
          onValueChange={(value) => setFileInputMode(value as 'upload' | 'url')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
            <TabsTrigger value="url">URL Externa</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-2">
            <FileUpload
              type="document"
              onUploadComplete={(url) => {
                setFileInputMode('upload')
                onFormChange({ ...form, content_url: url })
              }}
              onUploadError={(error) => {
                console.error('Upload error:', error)
              }}
              uploadedUrl={fileInputMode === 'upload' ? form.content_url : undefined}
              onClearUploaded={() => onFormChange({ ...form, content_url: '' })}
              accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              buttonText="Selecionar Arquivo"
              showPreview={false}
            />
            <p className={hintClass}>
              Formatos aceitos: PDF, ZIP, Word, Excel e PowerPoint (máx. 100MB)
            </p>
          </TabsContent>

          <TabsContent value="url" className="space-y-2">
            <Input
              type="url"
              value={form.content_url}
              onChange={(event) => onFormChange({ ...form, content_url: event.target.value })}
              placeholder="https://exemplo.com/arquivo.pdf"
              className={errors.content_url ? 'border-red-500' : ''}
            />
            <p className={hintClass}>Cole o link direto para o arquivo ou site de referência</p>
          </TabsContent>
        </Tabs>
        {errors.content_url && <p className="text-sm text-red-500">{errors.content_url}</p>}
      </div>
    )
  }

  if (form.type === 'text') {
    return (
      <div className="space-y-2">
        <Label htmlFor="lesson-content-text">
          Conteúdo <span className="text-red-500">*</span>
        </Label>
        <RichTextEditor
          content={form.content_text}
          onChange={(html) => onFormChange({ ...form, content_text: html })}
          placeholder="Escreva o conteúdo da aula em linguagem clara e objetiva..."
          className={errors.content_text ? 'border-red-500' : ''}
        />
        {errors.content_text && <p className="text-sm text-red-500">{errors.content_text}</p>}
        <p className={hintClass}>Use a barra de ferramentas para formatar o texto</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-2">
      <Label>
        Questões do Quiz <span className="text-red-500">*</span>
      </Label>
      <QuizBuilder
        initialQuestions={form.quiz_questions ?? EMPTY_QUIZ_QUESTIONS}
        initialSettings={form.quiz_settings}
        onChange={(questions, settings) => {
          const currentQuestions = form.quiz_questions ?? EMPTY_QUIZ_QUESTIONS
          const nextQuestions = questions as NonNullable<LessonFormData['quiz_questions']>
          const nextSettings = settings as LessonFormData['quiz_settings']
          if (
            areQuizQuestionsEqual(currentQuestions, nextQuestions) &&
            areQuizSettingsEqual(form.quiz_settings, nextSettings)
          ) {
            return
          }

          onFormChange({ ...form, quiz_questions: nextQuestions, quiz_settings: nextSettings })
        }}
      />
      {errors.quiz_questions && <p className="text-sm text-red-500">{errors.quiz_questions}</p>}
    </div>
  )
}
