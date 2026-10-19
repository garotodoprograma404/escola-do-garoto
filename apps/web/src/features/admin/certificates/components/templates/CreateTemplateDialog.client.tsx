'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useToast } from '@/shared/hooks/use-toast'
import { createCertificateTemplateAction } from '../../actions/certificate-template-actions'
import { normalizeNullableText } from '@/shared/lib/format'
import { EMPTY_TEMPLATE_DRAFT, TemplateFormFields, type TemplateDraft } from './TemplateFormFields'

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Cria um modelo em rascunho (versão inicial v1); o desenho é feito depois, no construtor. */
export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_TEMPLATE_DRAFT)

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) setDraft(EMPTY_TEMPLATE_DRAFT)
  }

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createCertificateTemplateAction(draft)

      if (!result.success) {
        toast({
          title: 'Erro ao criar template',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Template criado',
        description: 'Template criado em rascunho com versão inicial v1.',
      })
      handleOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo template de certificado</DialogTitle>
          <DialogDescription>
            Cria um template em rascunho com versão inicial v1. Depois, desenhe o certificado no
            builder e publique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TemplateFormFields
            idPrefix="new-template"
            draft={draft}
            onChange={(patch) => setDraft({ ...draft, ...patch })}
            nameLabel="Nome"
            namePlaceholder="Ex: Certificado oficial"
            descriptionLabel="Descrição"
            descriptionPlaceholder="Descreva rapidamente o objetivo deste template."
          />
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={isPending || normalizeNullableText(draft.name).length < 3}
          >
            {isPending ? 'Criando...' : 'Criar template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
