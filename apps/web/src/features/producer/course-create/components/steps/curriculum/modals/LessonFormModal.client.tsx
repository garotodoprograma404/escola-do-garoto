'use client'

import { Video, FileText, HelpCircle, File } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { Switch } from '@/shared/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { Lesson } from '../../../../types'
import type { LessonFormData } from '../types'
import { LESSON_FIELD_COPY, LESSON_MODAL_COPY } from './lesson-copy'
import { LessonContentFields } from './LessonContentFields.client'

interface LessonFormModalProps {
  isOpen: boolean
  editing: { moduleId: string; lesson: Lesson } | null
  form: LessonFormData
  errors: Partial<Record<keyof LessonFormData, string>>
  onFormChange: (form: LessonFormData) => void
  onSave: () => void
  onClose: () => void
}

/**
 * Modal para criar/editar aula
 */
export function LessonFormModal({
  isOpen,
  editing,
  form,
  errors,
  onFormChange,
  onSave,
  onClose,
}: LessonFormModalProps) {
  const fieldCopy = LESSON_FIELD_COPY[form.type]
  const modalCopy = LESSON_MODAL_COPY[form.type]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{editing ? modalCopy.editTitle : modalCopy.createTitle}</DialogTitle>
          <DialogDescription>
            {editing ? modalCopy.editDescription : modalCopy.createDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="lesson-type">
              Tipo de Conteúdo <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.type}
              onValueChange={(value: string) =>
                onFormChange({ ...form, type: value as 'video' | 'text' | 'quiz' | 'file' })
              }
            >
              <SelectTrigger id="lesson-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video size={16} />
                    <span>Vídeo (YouTube, Vimeo, etc)</span>
                  </div>
                </SelectItem>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>Texto / Artigo</span>
                  </div>
                </SelectItem>
                <SelectItem value="file">
                  <div className="flex items-center gap-2">
                    <File size={16} />
                    <span>Arquivo (PDF, ZIP, etc)</span>
                  </div>
                </SelectItem>
                <SelectItem value="quiz">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} />
                    <span>Quiz / Avaliação</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="lesson-title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lesson-title"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSave()
                }
              }}
              placeholder={fieldCopy.titlePlaceholder}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="lesson-description">Descrição (opcional)</Label>
            <Textarea
              id="lesson-description"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  onSave()
                }
              }}
              placeholder={fieldCopy.descriptionPlaceholder}
              rows={2}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="lesson-duration">
              {fieldCopy.durationLabel} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lesson-duration"
              type="number"
              min="1"
              value={form.duration_minutes}
              onChange={(e) => onFormChange({ ...form, duration_minutes: e.target.value })}
              placeholder={fieldCopy.durationPlaceholder}
              className={errors.duration_minutes ? 'border-red-500' : ''}
            />
            <p className="text-xs text-slate-600 dark:text-slate-400">{fieldCopy.durationHelp}</p>
            {errors.duration_minutes && (
              <p className="text-sm text-red-500">{errors.duration_minutes}</p>
            )}
          </div>

          <LessonContentFields
            isOpen={isOpen}
            form={form}
            errors={errors}
            onFormChange={onFormChange}
          />

          {/* Preview Toggle */}
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <div className="space-y-0.5">
              <Label htmlFor="lesson-preview" className="cursor-pointer text-base">
                {fieldCopy.previewTitle}
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {fieldCopy.previewDescription}
              </p>
            </div>
            <Switch
              id="lesson-preview"
              checked={form.is_preview}
              onCheckedChange={(checked) => onFormChange({ ...form, is_preview: checked })}
            />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 -mx-6 gap-2 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:space-x-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSave}>
            {editing ? 'Salvar Alterações' : modalCopy.createSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
