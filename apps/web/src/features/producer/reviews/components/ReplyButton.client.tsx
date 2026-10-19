// =====================================================
// PRODUCER REVIEWS - REPLY BUTTON (Client Component)
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
import { ReplyForm } from './ReplyForm.client'

interface ReplyButtonProps {
  reviewId: string
  studentName: string
  reviewText?: string
}

export function ReplyButton({ reviewId, studentName, reviewText }: ReplyButtonProps) {
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
          <DialogTitle>Responder Avaliação</DialogTitle>
          <DialogDescription>Avaliação de {studentName}</DialogDescription>
        </DialogHeader>
        {reviewText && (
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-sm text-slate-700 dark:text-slate-300">{reviewText}</p>
          </div>
        )}
        <ReplyForm reviewId={reviewId} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
