'use client'

import { useEffect, useMemo } from 'react'
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
import { Textarea } from '@/shared/components/ui/textarea'
import type { AffiliateCourseOption, AffiliateOption, AffiliatePartnershipListItem } from '../types'

const partnershipFormSchema = z
  .object({
    affiliateId: z.string().uuid('Afiliado inválido'),
    courseId: z.string().min(1, 'Curso obrigatório'),
    commissionRate: z.coerce
      .number()
      .gt(0, 'Comissão deve ser maior que zero')
      .max(100, 'Comissão deve ser no máximo 100%'),
    cookieWindowDays: z.coerce
      .number()
      .int('Janela deve ser um número inteiro')
      .min(1, 'Janela deve ser de pelo menos 1 dia')
      .max(90, 'Janela deve ser de no máximo 90 dias'),
    status: z.enum(['pending', 'approved', 'rejected', 'revoked']),
    notes: z.string().optional(),
    rejectionReason: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'rejected' && !values.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejectionReason'],
        message: 'Informe o motivo da rejeição',
      })
    }
  })

export type AffiliatePartnershipFormValues = z.infer<typeof partnershipFormSchema>

interface AffiliatePartnershipFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPartnership?: AffiliatePartnershipListItem | null
  prefillValues?: Partial<AffiliatePartnershipFormValues> | null
  affiliateOptions: AffiliateOption[]
  courseOptions: AffiliateCourseOption[]
  isSubmitting: boolean
  error: string | null
  onSubmit: (values: AffiliatePartnershipFormValues) => Promise<void>
}

export function AffiliatePartnershipFormDialog({
  open,
  onOpenChange,
  initialPartnership,
  prefillValues,
  affiliateOptions,
  courseOptions,
  isSubmitting,
  error,
  onSubmit,
}: AffiliatePartnershipFormDialogProps) {
  const form = useForm<AffiliatePartnershipFormValues>({
    resolver: zodResolver(partnershipFormSchema),
    defaultValues: {
      affiliateId: '',
      courseId: '',
      commissionRate: 20,
      cookieWindowDays: 30,
      status: 'pending',
      notes: '',
      rejectionReason: '',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (!initialPartnership) {
      form.reset({
        affiliateId: prefillValues?.affiliateId || '',
        courseId: prefillValues?.courseId || '',
        commissionRate: prefillValues?.commissionRate ?? 20,
        cookieWindowDays: prefillValues?.cookieWindowDays ?? 30,
        status: prefillValues?.status ?? 'pending',
        notes: prefillValues?.notes || '',
        rejectionReason: prefillValues?.rejectionReason || '',
      })
      return
    }

    form.reset({
      affiliateId: initialPartnership.affiliateId,
      courseId: initialPartnership.courseId,
      commissionRate: initialPartnership.commissionRate,
      cookieWindowDays: initialPartnership.cookieWindowDays,
      status: initialPartnership.status,
      notes: initialPartnership.notes || '',
      rejectionReason: initialPartnership.rejectionReason || '',
    })
  }, [form, initialPartnership, open, prefillValues])

  const status = form.watch('status')
  const affiliateId = form.watch('affiliateId')
  const courseId = form.watch('courseId')
  const commissionRate = form.watch('commissionRate')
  const cookieWindowDays = form.watch('cookieWindowDays')
  const hasAffiliateOptions = affiliateOptions.length > 0
  const hasCourseOptions = courseOptions.length > 0
  const selectedAffiliate = useMemo(
    () => affiliateOptions.find((affiliate) => affiliate.id === affiliateId) ?? null,
    [affiliateId, affiliateOptions],
  )
  const selectedCourse = useMemo(
    () => courseOptions.find((course) => course.id === courseId) ?? null,
    [courseId, courseOptions],
  )

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialPartnership ? 'Editar parceria' : 'Nova parceria'}</DialogTitle>
          <DialogDescription>
            Defina elegibilidade comercial entre afiliado e curso, incluindo comissão e janela de
            atribuição.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {!hasAffiliateOptions ? (
            <Alert>
              <AlertDescription>
                Nenhum afiliado elegível foi encontrado. Aprove uma candidatura primeiro para
                liberar a criacao de parcerias.
              </AlertDescription>
            </Alert>
          ) : null}

          {!hasCourseOptions ? (
            <Alert>
              <AlertDescription>
                Nenhum curso aprovado está disponível para parceria no momento.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partnership-affiliate">Afiliado</Label>
              <Select
                value={form.watch('affiliateId')}
                onValueChange={(value) =>
                  form.setValue('affiliateId', value, { shouldValidate: true })
                }
                disabled={isSubmitting || Boolean(initialPartnership) || !hasAffiliateOptions}
              >
                <SelectTrigger id="partnership-affiliate">
                  <SelectValue placeholder="Selecione um afiliado" />
                </SelectTrigger>
                <SelectContent>
                  {affiliateOptions.map((affiliate) => (
                    <SelectItem key={affiliate.id} value={affiliate.id}>
                      {affiliate.name} {affiliate.email ? `(${affiliate.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.affiliateId ? (
                <p className="text-sm text-red-500">{form.formState.errors.affiliateId.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="partnership-course">Curso</Label>
              <Select
                value={form.watch('courseId')}
                onValueChange={(value) =>
                  form.setValue('courseId', value, { shouldValidate: true })
                }
                disabled={isSubmitting || Boolean(initialPartnership) || !hasCourseOptions}
              >
                <SelectTrigger id="partnership-course">
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title} ({course.producerName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.courseId ? (
                <p className="text-sm text-red-500">{form.formState.errors.courseId.message}</p>
              ) : null}
            </div>
          </div>

          {selectedAffiliate || selectedCourse ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-slate-50/80 p-4 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Afiliado selecionado
                </p>
                {selectedAffiliate ? (
                  <div className="mt-3 space-y-1">
                    <p className="font-medium">{selectedAffiliate.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAffiliate.email || 'Sem e-mail operacional informado'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Escolha um afiliado para ver o contexto da parceria.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border bg-slate-50/80 p-4 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Curso e produtor
                </p>
                {selectedCourse ? (
                  <div className="mt-3 space-y-1">
                    <p className="font-medium">{selectedCourse.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Produtor: {selectedCourse.producerName}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Escolha um curso para conferir quem será impactado por esta parceria.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Comissão (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                step="0.01"
                {...form.register('commissionRate')}
              />
              <p className="text-xs text-muted-foreground">
                Percentual da venda atribuido ao afiliado nesta parceria.
              </p>
              {form.formState.errors.commissionRate ? (
                <p className="text-sm text-red-500">
                  {form.formState.errors.commissionRate.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cookieWindowDays">Janela (dias)</Label>
              <Input id="cookieWindowDays" type="number" {...form.register('cookieWindowDays')} />
              <p className="text-xs text-muted-foreground">
                Período em que o clique continua elegível para atribuição da venda.
              </p>
              {form.formState.errors.cookieWindowDays ? (
                <p className="text-sm text-red-500">
                  {form.formState.errors.cookieWindowDays.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="partnership-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  form.setValue('status', value as AffiliatePartnershipFormValues['status'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="partnership-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="rejected">Rejeitada</SelectItem>
                  <SelectItem value="revoked">Revogada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use `Aprovada` para liberar a operação comercial deste curso.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            {selectedAffiliate && selectedCourse ? (
              <>
                Esta parceria vai conectar <strong>{selectedAffiliate.name}</strong> ao curso{' '}
                <strong>{selectedCourse.title}</strong> com comissão inicial de{' '}
                <strong>{Number(commissionRate || 0).toFixed(2)}%</strong> e janela de{' '}
                <strong>{Number(cookieWindowDays || 0)} dias</strong>.
              </>
            ) : (
              'Selecione afiliado e curso para revisar o resumo operacional antes de salvar.'
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas operacionais</Label>
            <Textarea id="notes" rows={3} {...form.register('notes')} />
          </div>

          {status === 'rejected' ? (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Motivo da rejeição</Label>
              <Textarea id="rejectionReason" rows={3} {...form.register('rejectionReason')} />
              {form.formState.errors.rejectionReason ? (
                <p className="text-sm text-red-500">
                  {form.formState.errors.rejectionReason.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hasAffiliateOptions || !hasCourseOptions}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar parceria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
