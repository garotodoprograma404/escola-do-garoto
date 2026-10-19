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
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import type {
  AffiliateApplicationListItem,
  AffiliateApplicationStatus,
  AffiliateCourseOption,
} from '../types'

const REVIEW_LATER = '__review_later__'

const reviewFormSchema = z
  .object({
    status: z.enum(['pending', 'under_review', 'approved', 'rejected']),
    rejectionReason: z.string().trim().max(500).optional(),
    notes: z.string().trim().max(1000).optional(),
    partnershipCourseId: z.string().optional(),
    partnershipCommissionRate: z.coerce.number().optional(),
    partnershipCookieWindowDays: z.coerce.number().optional(),
    partnershipNotes: z.string().trim().max(1000).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'rejected' && !values.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Informe o motivo da rejeição',
      })
    }

    if (
      values.status === 'approved' &&
      values.partnershipCourseId &&
      values.partnershipCourseId !== REVIEW_LATER
    ) {
      if (
        !values.partnershipCommissionRate ||
        values.partnershipCommissionRate <= 0 ||
        values.partnershipCommissionRate > 100
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partnershipCommissionRate'],
          message: 'Informe uma comissão entre 0,01% e 100%',
        })
      }

      if (
        !values.partnershipCookieWindowDays ||
        !Number.isInteger(values.partnershipCookieWindowDays) ||
        values.partnershipCookieWindowDays < 1 ||
        values.partnershipCookieWindowDays > 90
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['partnershipCookieWindowDays'],
          message: 'Informe uma janela entre 1 e 90 dias',
        })
      }
    }
  })

type ReviewFormValues = z.infer<typeof reviewFormSchema>

interface AffiliateApplicationReviewDialogProps {
  application: AffiliateApplicationListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: {
    applicationId: string
    status: AffiliateApplicationStatus
    rejectionReason?: string
    notes?: string
    partnershipCourseId?: string
    partnershipCommissionRate?: number
    partnershipCookieWindowDays?: number
    partnershipNotes?: string
  }) => void
  isSubmitting: boolean
  courseOptions: AffiliateCourseOption[]
}

const STATUS_OPTIONS: Array<{ value: AffiliateApplicationStatus; label: string }> = [
  { value: 'pending', label: 'Pendente' },
  { value: 'under_review', label: 'Em análise' },
  { value: 'approved', label: 'Aprovar e liberar acesso' },
  { value: 'rejected', label: 'Rejeitar' },
]

export function AffiliateApplicationReviewDialog({
  application,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  courseOptions,
}: AffiliateApplicationReviewDialogProps) {
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      status: 'pending',
      rejectionReason: '',
      notes: '',
      partnershipCourseId: REVIEW_LATER,
      partnershipCommissionRate: 20,
      partnershipCookieWindowDays: 30,
      partnershipNotes: '',
    },
  })

  useEffect(() => {
    if (!application) {
      return
    }

    form.reset({
      status: application.status,
      rejectionReason: application.rejectionReason || '',
      notes: application.notes || '',
      partnershipCourseId: REVIEW_LATER,
      partnershipCommissionRate: 20,
      partnershipCookieWindowDays: 30,
      partnershipNotes: '',
    })
  }, [application, form])

  const status = form.watch('status')
  const selectedCourseId = form.watch('partnershipCourseId')
  const shouldConfigurePartnership =
    status === 'approved' && selectedCourseId && selectedCourseId !== REVIEW_LATER
  const hasCourseOptions = courseOptions.length > 0

  const handleSubmit = form.handleSubmit((values) => {
    if (!application) {
      return
    }

    onSubmit({
      applicationId: application.id,
      status: values.status,
      rejectionReason: values.rejectionReason,
      notes: values.notes,
      partnershipCourseId:
        values.partnershipCourseId && values.partnershipCourseId !== REVIEW_LATER
          ? values.partnershipCourseId
          : undefined,
      partnershipCommissionRate: shouldConfigurePartnership
        ? values.partnershipCommissionRate
        : undefined,
      partnershipCookieWindowDays: shouldConfigurePartnership
        ? values.partnershipCookieWindowDays
        : undefined,
      partnershipNotes: shouldConfigurePartnership ? values.partnershipNotes : undefined,
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[min(920px,calc(100vw-1rem))] flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-5 py-4 sm:px-6">
          <DialogTitle className="text-xl sm:text-2xl">Revisar candidatura de afiliado</DialogTitle>
          <DialogDescription>
            Avalie o perfil, registre observações internas e defina o próximo status da candidatura.
          </DialogDescription>
        </DialogHeader>

        {application ? (
          <form
            id="affiliate-application-review-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
          >
            <div className="space-y-6">
              <section className="rounded-2xl border bg-slate-50/80 p-4 dark:bg-slate-950/70">
                <div className="grid gap-4">
                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Candidato
                    </p>
                    <p className="mt-3 text-lg font-semibold">{application.fullName}</p>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <p>{application.email}</p>
                      <p>{application.phone}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Alcance e canais
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {application.promotionChannels.length > 0 ? (
                        application.promotionChannels.map((channel) => (
                          <span
                            key={channel}
                            className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground"
                          >
                            {channel}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Nenhum canal informado
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Audiência: {application.audienceSize || 'Não informada'}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-4">
                <div className="space-y-4 rounded-2xl border p-4">
                  <div className="space-y-2">
                    <Label htmlFor="review-status">Status</Label>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        form.setValue('status', value as AffiliateApplicationStatus, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger id="review-status" className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Motivo da rejeição</Label>
                    <Textarea
                      id="rejectionReason"
                      rows={5}
                      {...form.register('rejectionReason')}
                      placeholder="Explique a decisão quando houver necessidade de rejeição ou ajuste"
                    />
                    {form.formState.errors.rejectionReason ? (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.rejectionReason.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border p-4">
                    <p className="text-sm font-semibold">Resumo da audiência</p>
                    <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                      {application.audienceSummary}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="text-sm font-semibold">Experiência</p>
                    <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                      {application.experienceSummary}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-4">
                    <p className="text-sm font-semibold">Motivação</p>
                    <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">
                      {application.whyAffiliate}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border p-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas internas</Label>
                  <Textarea
                    id="notes"
                    rows={5}
                    {...form.register('notes')}
                    placeholder="Contexto interno do time comercial ou operacional"
                  />
                </div>
              </section>

              {status === 'approved' ? (
                <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-5">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Configuracao comercial inicial
                    </p>
                    <p className="max-w-3xl text-sm leading-6 text-emerald-800/80 dark:text-emerald-200/80">
                      Aprove a candidatura e, se quiser, já saia desta revisão com a primeira
                      parceria configurada.
                    </p>
                  </div>

                  {!hasCourseOptions ? (
                    <Alert>
                      <AlertDescription>
                        Nenhum curso aprovado está disponível para criar parceria neste momento.
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-4">
                    <div className="space-y-4 rounded-2xl border bg-background p-4">
                      <div className="space-y-2">
                        <Label htmlFor="review-course">Curso para parceria inicial</Label>
                        <Select
                          value={selectedCourseId || REVIEW_LATER}
                          onValueChange={(value) =>
                            form.setValue('partnershipCourseId', value, { shouldValidate: true })
                          }
                          disabled={!hasCourseOptions}
                        >
                          <SelectTrigger id="review-course" className="h-12">
                            <SelectValue placeholder="Criar parceria depois" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={REVIEW_LATER}>Criar parceria depois</SelectItem>
                            {courseOptions.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.title} ({course.producerName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="partnershipNotes">Notas da parceria</Label>
                        <Textarea
                          id="partnershipNotes"
                          rows={5}
                          {...form.register('partnershipNotes')}
                          placeholder="Observações comerciais ou operacionais desta parceria inicial"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border bg-background p-4">
                      <div className="space-y-2">
                        <Label htmlFor="partnershipCommissionRate">Comissão inicial (%)</Label>
                        <Input
                          id="partnershipCommissionRate"
                          type="number"
                          step="0.01"
                          className="h-12"
                          {...form.register('partnershipCommissionRate')}
                        />
                        {form.formState.errors.partnershipCommissionRate ? (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.partnershipCommissionRate.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="partnershipCookieWindowDays">
                          Janela de atribuicao (dias)
                        </Label>
                        <Input
                          id="partnershipCookieWindowDays"
                          type="number"
                          className="h-12"
                          {...form.register('partnershipCookieWindowDays')}
                        />
                        {form.formState.errors.partnershipCookieWindowDays ? (
                          <p className="text-sm text-red-500">
                            {form.formState.errors.partnershipCookieWindowDays.message}
                          </p>
                        ) : null}
                      </div>

                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        {shouldConfigurePartnership
                          ? 'A aprovacao vai liberar a role do afiliado e salvar a parceria inicial com os parametros acima.'
                          : 'Se você quiser apenas aprovar o afiliado agora, mantenha a opção "Criar parceria depois".'}
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          </form>
        ) : null}

        <DialogFooter className="border-t bg-background px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="affiliate-application-review-form"
            disabled={isSubmitting || !application}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {status === 'approved' ? 'Salvar e aprovar' : 'Salvar revisão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
