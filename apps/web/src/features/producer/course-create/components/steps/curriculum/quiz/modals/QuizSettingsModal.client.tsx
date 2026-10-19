'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { QuizSettingsForm } from '../components/QuizSettingsForm.client'
import type { QuizSettings } from '../types'

interface QuizSettingsModalProps {
  open: boolean
  onClose: () => void
  settings: QuizSettings
  onUpdate: (updates: Partial<QuizSettings>) => void
}

export function QuizSettingsModal({ open, onClose, settings, onUpdate }: QuizSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurações do Quiz</DialogTitle>
          <DialogDescription>
            Ajuste aprovação opcional, tempo e comportamento da tentativa.
          </DialogDescription>
        </DialogHeader>
        <QuizSettingsForm settings={settings} onUpdate={onUpdate} onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}
