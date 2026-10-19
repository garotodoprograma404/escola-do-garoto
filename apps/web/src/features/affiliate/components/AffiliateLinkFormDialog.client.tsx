'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import type { AffiliateApprovedPartnershipOption, AffiliateLinkListItem } from '../types'

const affiliateLinkFormSchema = z.object({
  partnershipId: z.string().min(1, 'Selecione uma parceria'),
  campaignName: z.string().max(80).optional(),
  trafficSource: z.string().max(80).optional(),
  destinationPath: z.string().max(160).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
})

export type AffiliateLinkFormValues = z.infer<typeof affiliateLinkFormSchema>

interface AffiliateLinkFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerships: AffiliateApprovedPartnershipOption[]
  initialLink?: AffiliateLinkListItem | null
  isSubmitting: boolean
  error: string | null
  onSubmit: (values: AffiliateLinkFormValues) => Promise<void>
}

export function AffiliateLinkFormDialog({
  open,
  onOpenChange,
  partnerships,
  initialLink,
  isSubmitting,
  error,
  onSubmit,
}: AffiliateLinkFormDialogProps) {
  const form = useForm<AffiliateLinkFormValues>({
    resolver: zodResolver(affiliateLinkFormSchema),
    defaultValues: {
      partnershipId: '',
      campaignName: '',
      trafficSource: '',
      destinationPath: '',
      notes: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (!initialLink) {
      form.reset({
        partnershipId: partnerships[0]?.id ?? '',
        campaignName: '',
        trafficSource: '',
        destinationPath: '',
        notes: '',
        isActive: true,
      })
      return
    }

    form.reset({
      partnershipId: initialLink.partnershipId,
      campaignName: initialLink.campaignName || '',
      trafficSource: initialLink.trafficSource || '',
      destinationPath: initialLink.destinationPath || '',
      notes: initialLink.notes || '',
      isActive: initialLink.isActive,
    })
  }, [form, initialLink, open, partnerships])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  const selectedPartnershipId = form.watch('partnershipId')
  const selectedPartnership = partnerships.find(
    (partnership) => partnership.id === selectedPartnershipId,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialLink ? 'Editar link' : 'Novo link de afiliado'}</DialogTitle>
          <DialogDescription>
            Organize campanhas por curso, origem de tráfego e URL de destino usando um código
            público de atribuição.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="link-partnership">Parceria aprovada</Label>
            <Select
              value={selectedPartnershipId}
              onValueChange={(value) =>
                form.setValue('partnershipId', value, { shouldValidate: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="link-partnership">
                <SelectValue placeholder="Selecione um curso aprovado" />
              </SelectTrigger>
              <SelectContent>
                {partnerships.map((partnership) => (
                  <SelectItem key={partnership.id} value={partnership.id}>
                    {partnership.courseTitle} ({partnership.commissionRate}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPartnership ? (
              <p className="text-xs text-muted-foreground">
                Janela de atribuição: {selectedPartnership.cookieWindowDays} dias.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Nome da campanha</Label>
              <Input
                id="campaignName"
                placeholder="Ex.: Instagram Abril"
                {...form.register('campaignName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trafficSource">Origem do tráfego</Label>
              <Input
                id="trafficSource"
                placeholder="Ex.: instagram, youtube, email"
                {...form.register('trafficSource')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationPath">Caminho de destino</Label>
            <Input
              id="destinationPath"
              placeholder="/courses/nome-do-curso"
              {...form.register('destinationPath')}
            />
            <p className="text-xs text-muted-foreground">
              Se ficar vazio, o link aponta automaticamente para a página do curso da parceria.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Observações internas da campanha"
              {...form.register('notes')}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Link ativo</p>
              <p className="text-xs text-muted-foreground">
                Links inativos deixam de ser usados em novas atribuições.
              </p>
            </div>
            <Switch
              checked={form.watch('isActive')}
              onCheckedChange={(checked) =>
                form.setValue('isActive', checked, { shouldValidate: true })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
