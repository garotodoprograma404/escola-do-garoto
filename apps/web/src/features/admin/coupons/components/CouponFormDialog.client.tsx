'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import type { Coupon, CouponCourseOption } from '../types'

const couponFormUISchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Código deve ter no mínimo 3 caracteres')
    .max(40, 'Código muito longo')
    .regex(/^[A-Za-z0-9_-]+$/, 'Use apenas letras, números, _ e -'),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive('Valor deve ser maior que zero'),
  description: z.string().trim().max(255).optional(),
  usageLimit: z.string().optional(),
  minPurchaseAmount: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  validFrom: z.string().min(1, 'Data inicial obrigatória'),
  validUntil: z.string().optional(),
  applicableCourseId: z.string(),
})

type CouponFormUIValues = z.infer<typeof couponFormUISchema>

interface CouponSubmitPayload {
  code: string
  type: 'percentage' | 'fixed'
  value: number
  description?: string
  usageLimit: number | null
  minPurchaseAmount: number | null
  maxDiscountAmount: number | null
  validFrom: string
  validUntil: string | null
  applicableCourses: string[]
}

interface CouponFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialCoupon?: Coupon | null
  courses: CouponCourseOption[]
  isSubmitting: boolean
  error: string | null
  onSubmit: (payload: CouponSubmitPayload) => Promise<void>
}

function toDatetimeLocal(dateInput?: string | null): string {
  if (!dateInput) {
    const now = new Date()
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    return localNow.toISOString().slice(0, 16)
  }

  const date = new Date(dateInput)
  if (!Number.isFinite(date.getTime())) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function parseOptionalNumber(value?: string): number | null {
  if (!value || value.trim().length === 0) {
    return null
  }

  const normalized = Number(value.replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : null
}

export function CouponFormDialog({
  open,
  onOpenChange,
  mode,
  initialCoupon,
  courses,
  isSubmitting,
  error,
  onSubmit,
}: CouponFormDialogProps) {
  const form = useForm<CouponFormUIValues>({
    resolver: zodResolver(couponFormUISchema),
    defaultValues: {
      code: '',
      type: 'percentage',
      value: 10,
      description: '',
      usageLimit: '',
      minPurchaseAmount: '',
      maxDiscountAmount: '',
      validFrom: toDatetimeLocal(),
      validUntil: '',
      applicableCourseId: 'all',
    },
  })

  useEffect(() => {
    if (!open) {
      return
    }

    if (!initialCoupon) {
      form.reset({
        code: '',
        type: 'percentage',
        value: 10,
        description: '',
        usageLimit: '',
        minPurchaseAmount: '',
        maxDiscountAmount: '',
        validFrom: toDatetimeLocal(),
        validUntil: '',
        applicableCourseId: 'all',
      })
      return
    }

    form.reset({
      code: initialCoupon.code,
      type: initialCoupon.type,
      value: initialCoupon.value,
      description: initialCoupon.description || '',
      usageLimit: initialCoupon.usageLimit ? String(initialCoupon.usageLimit) : '',
      minPurchaseAmount: initialCoupon.minPurchaseAmount
        ? String(initialCoupon.minPurchaseAmount)
        : '',
      maxDiscountAmount: initialCoupon.maxDiscountAmount
        ? String(initialCoupon.maxDiscountAmount)
        : '',
      validFrom: toDatetimeLocal(initialCoupon.validFrom),
      validUntil: initialCoupon.validUntil ? toDatetimeLocal(initialCoupon.validUntil) : '',
      applicableCourseId: initialCoupon.applicableCourses[0] || 'all',
    })
  }, [form, initialCoupon, open])

  const discountType = form.watch('type')

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({
      code: values.code.trim().toUpperCase(),
      type: values.type,
      value: values.value,
      description: values.description?.trim() || undefined,
      usageLimit: parseOptionalNumber(values.usageLimit),
      minPurchaseAmount: parseOptionalNumber(values.minPurchaseAmount),
      maxDiscountAmount: parseOptionalNumber(values.maxDiscountAmount),
      validFrom: values.validFrom,
      validUntil: values.validUntil?.trim() ? values.validUntil : null,
      applicableCourses:
        values.applicableCourseId && values.applicableCourseId !== 'all'
          ? [values.applicableCourseId]
          : [],
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo Cupom' : 'Editar Cupom'}</DialogTitle>
          <DialogDescription>
            Configure desconto em valor fixo ou percentual com cursos elegíveis carregados do banco
            real.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Código *</Label>
              <Input
                id="coupon-code"
                placeholder="EX: BEMVINDO10"
                {...form.register('code')}
                disabled={isSubmitting}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-type">Tipo de desconto *</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as 'percentage' | 'fixed')}
                disabled={isSubmitting}
              >
                <SelectTrigger id="coupon-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-value">
                Valor do desconto * {discountType === 'percentage' ? '(%)' : '(R$)'}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                min="0"
                {...form.register('value', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {form.formState.errors.value && (
                <p className="text-sm text-red-500">{form.formState.errors.value.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-usage-limit">Limite de uso (opcional)</Label>
              <Input
                id="coupon-usage-limit"
                type="number"
                min="1"
                placeholder="Ex: 100"
                {...form.register('usageLimit')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-description">Descrição</Label>
            <Textarea
              id="coupon-description"
              rows={2}
              placeholder="Ex: Promoção de lançamento do curso"
              {...form.register('description')}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-min-purchase">Compra mínima (R$)</Label>
              <Input
                id="coupon-min-purchase"
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                {...form.register('minPurchaseAmount')}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-max-discount">Desconto máximo (R$)</Label>
              <Input
                id="coupon-max-discount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                {...form.register('maxDiscountAmount')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-valid-from">Válido a partir de *</Label>
              <Input
                id="coupon-valid-from"
                type="datetime-local"
                {...form.register('validFrom')}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-valid-until">Válido até</Label>
              <Input
                id="coupon-valid-until"
                type="datetime-local"
                {...form.register('validUntil')}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon-course">Curso aplicável</Label>
            <Select
              value={form.watch('applicableCourseId')}
              onValueChange={(value) => form.setValue('applicableCourseId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="coupon-course">
                <SelectValue placeholder="Selecione um curso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos elegíveis</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title} - {formatBRL(course.discountPrice ?? course.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Se selecionar um curso, o cupom só funciona nele. A lista mostra apenas cursos
              aprovados e publicados.
            </p>
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
            <Button
              type="submit"
              className="bg-brand-500 text-black hover:bg-brand-400"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Criar Cupom' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
