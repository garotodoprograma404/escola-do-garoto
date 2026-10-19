// =====================================================
// PRODUCER Q&A - ANSWER BUTTON (Client Component)
// =====================================================

'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { AnswerForm } from './AnswerForm.client'

interface AnswerButtonProps {
  questionId: string
  questionText: string
  studentName: string
}

export function AnswerButton({ questionId, questionText, studentName }: AnswerButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquare className="mr-2 h-4 w-4" />
          Responder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Responder Pergunta</DialogTitle>
          <DialogDescription>Pergunta de {studentName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-sm text-slate-700 dark:text-slate-300">{questionText}</p>
          </div>
          <AnswerForm questionId={questionId} onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
