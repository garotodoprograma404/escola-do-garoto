'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, CheckCircle2, Globe, Mail, MapPin, Phone, Video } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Separator } from '@/shared/components/ui/separator'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { formatDateTime, normalizeNullableText } from '@/shared/lib/format'
import { updateProducerLeadAction } from '../../actions/update-producer-lead'
import {
  LEAD_STATUS_OPTIONS,
  formatPhone,
  leadStatusBadgeClass,
  leadStatusLabel,
  toWhatsAppHref,
} from '../../lib/leadsDisplay'
import type { ProducerLead, ProducerLeadStatus } from '../../services/producerLeadsService'

function YesNoTile({
  label,
  value,
  icon,
}: {
  label: string
  value: boolean
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      <p className="font-medium text-slate-900 dark:text-white">{label}</p>
      <p className="mt-1 inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
        {icon}
        {value ? 'Sim' : 'Não'}
      </p>
    </div>
  )
}

/** Dados completos do lead selecionado e o tratamento comercial (situação e observações do admin). */
export function LeadDetails({ lead }: { lead: ProducerLead | null }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<ProducerLeadStatus>(lead?.status ?? 'new')
  const [notes, setNotes] = useState(lead?.adminNotes || '')

  // Trocou de lead (ou os dados foram recarregados): o rascunho volta ao que está salvo.
  useEffect(() => {
    if (!lead) return
    setStatus(lead.status)
    setNotes(lead.adminNotes || '')
  }, [lead])

  const hasUnsavedChanges =
    lead !== null &&
    (status !== lead.status ||
      normalizeNullableText(notes) !== normalizeNullableText(lead.adminNotes))

  const handleSave = () => {
    if (!lead || !hasUnsavedChanges) return

    startTransition(async () => {
      const result = await updateProducerLeadAction({
        leadId: lead.id,
        status,
        adminNotes: notes,
      })

      if (result.error) {
        toast({ title: 'Erro ao salvar lead', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title: 'Lead atualizado',
        description: 'Status e observações foram salvos com sucesso.',
      })
      router.refresh()
    })
  }

  const whatsAppHref = lead ? toWhatsAppHref(lead.phone) : null

  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle>Detalhes do lead</CardTitle>
        <CardDescription>
          Visualize os dados completos e registre o andamento comercial.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!lead ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Selecione um lead na fila para visualizar os detalhes.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {lead.fullName}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Recebido em {formatDateTime(lead.createdAt)}
                  </p>
                </div>
                <Badge variant="outline" className={leadStatusBadgeClass(lead.status)}>
                  {leadStatusLabel(lead.status)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <a
                  className="inline-flex items-center gap-2 hover:text-brand-600 dark:hover:text-brand-300"
                  href={`mailto:${lead.email}`}
                >
                  <Mail className="h-4 w-4" />
                  {lead.email}
                </a>
                <a
                  className="inline-flex items-center gap-2 hover:text-brand-600 dark:hover:text-brand-300"
                  href={`tel:${lead.phone}`}
                >
                  <Phone className="h-4 w-4" />
                  {formatPhone(lead.phone)}
                </a>
                <p className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {lead.city}
                </p>
                {whatsAppHref ? (
                  <a
                    href={whatsAppHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-600 hover:underline dark:text-brand-300"
                  >
                    Abrir conversa no WhatsApp
                  </a>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <YesNoTile
                label="Experiência online"
                value={lead.hasOnlineExperience}
                icon={<Globe className="h-4 w-4" />}
              />
              <YesNoTile
                label="Conteúdo gravado"
                value={lead.hasRecordedContent}
                icon={<Video className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Tema sugerido
              </Label>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                {lead.topic || 'Não informado'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Mensagem enviada pelo lead
              </Label>
              <div className="min-h-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <p className="whitespace-pre-wrap break-words">
                  {lead.message || 'Sem mensagem adicional.'}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="lead-status">Status do lead</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ProducerLeadStatus)}
              >
                <SelectTrigger id="lead-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-admin-notes">Observações internas (somente admin)</Label>
              <Textarea
                id="lead-admin-notes"
                rows={5}
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Registre andamento, tentativas de contato, acordos e próximos passos."
              />
              <p className="text-right text-xs text-slate-600 dark:text-slate-400">
                {notes.length}/2000 caracteres
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Atualizado em {formatDateTime(lead.updatedAt)}
                </p>
                {lead.contactedAt ? (
                  <p className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Primeiro contato em {formatDateTime(lead.contactedAt)}
                  </p>
                ) : null}
              </div>

              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isPending}
                className="min-w-[190px]"
              >
                {isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
