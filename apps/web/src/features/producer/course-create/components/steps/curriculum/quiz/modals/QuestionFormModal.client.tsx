'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { QuestionForm } from '../components/QuestionForm.client'
import type { QuestionFormData } from '../types'

interface QuestionFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: QuestionFormData) => void
  initialData?: QuestionFormData
}

export function QuestionFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
}: QuestionFormModalProps) {
  const handleSubmit = (data: QuestionFormData): void => {
    onSubmit(data)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Questão' : 'Nova Questão'}</DialogTitle>
          <DialogDescription>
            Defina o tipo de questão, enunciado e critérios de correção.
          </DialogDescription>
        </DialogHeader>
        <QuestionForm initialData={initialData} onSubmit={handleSubmit} onCancel={onClose} />
      </DialogContent>
    </Dialog>
  )
}
