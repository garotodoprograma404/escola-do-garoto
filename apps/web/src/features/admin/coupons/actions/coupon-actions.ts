'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import type { Coupon } from '../types'

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = Number(value.replace(',', '.'))
    return Number.isFinite(normalized) ? normalized : value
  }

  return value
}, z.number().min(0).nullable())

// Validação de formulário (mensagem rápida na tela). Quem GARANTE as regras é a API, que valida
// de novo tudo isto (e a autorização de admin) antes de gravar.
const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Código deve ter pelo menos 3 caracteres')
      .max(40, 'Código muito longo')
      .regex(/^[A-Z0-9_-]+$/, 'Use apenas letras, números, _ e -')
      .transform((value) => value.toUpperCase()),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive('Valor do desconto deve ser maior que zero'),
    description: z.string().trim().max(255).optional(),
    usageLimit: optionalNumber,
    minPurchaseAmount: optionalNumber,
    maxDiscountAmount: optionalNumber,
    validFrom: z.string().trim().min(1, 'Data inicial é obrigatória'),
    validUntil: z.string().trim().optional().nullable(),
    applicableCourses: z.array(z.string().trim()).default([]),
  })
  .superRefine((data, ctx) => {
    const fromDate = new Date(data.validFrom)
    if (!Number.isFinite(fromDate.getTime())) {
      ctx.addIssue({
        code: 'custom',
        path: ['validFrom'],
        message: 'Data inicial inválida',
      })
    }

    if (data.type === 'percentage' && data.value > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Desconto percentual não pode ser maior que 100%',
      })
    }

    if (data.validUntil && data.validUntil.length > 0) {
      const untilDate = new Date(data.validUntil)

      if (!Number.isFinite(untilDate.getTime())) {
        ctx.addIssue({
          code: 'custom',
          path: ['validUntil'],
          message: 'Data final inválida',
        })
        return
      }

      if (Number.isFinite(fromDate.getTime()) && untilDate <= fromDate) {
        ctx.addIssue({
          code: 'custom',
          path: ['validUntil'],
          message: 'Data final deve ser maior que a data inicial',
        })
      }
    }
  })

export type CouponFormInput = z.input<typeof couponFormSchema>

function toWritePayload(data: z.output<typeof couponFormSchema>) {
  return {
    code: data.code,
    type: data.type,
    value: data.value,
    description: data.description?.trim() || data.code,
    usageLimit: data.usageLimit,
    minPurchaseAmount: data.minPurchaseAmount,
    maxDiscountAmount: data.maxDiscountAmount,
    validFrom: new Date(data.validFrom).toISOString(),
    validUntil: data.validUntil?.trim() ? new Date(data.validUntil).toISOString() : null,
    applicableCourses: data.applicableCourses,
  }
}

function errorMessageOf(statusCode: number, message: string, fallback: string): string {
  if (statusCode === 401) return 'Não autenticado'
  if (statusCode === 403) return 'Sem permissão para gerenciar cupons'
  return message || fallback
}

export async function createCouponAction(input: CouponFormInput) {
  const parsed = couponFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados inválidos',
    }
  }

  const result = await apiServer<Coupon>('/admin/coupons', {
    method: 'POST',
    body: toWritePayload(parsed.data),
  })
  if (!result.ok) {
    return {
      success: false,
      error: errorMessageOf(
        result.error.statusCode,
        result.error.message,
        'Não foi possível criar o cupom',
      ),
    }
  }

  revalidatePath('/admin/coupons')
  return { success: true }
}

export async function updateCouponAction(id: string, input: CouponFormInput) {
  const parsed = couponFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Dados inválidos',
    }
  }

  if (!/^\d{1,15}$/.test(id)) {
    return { success: false, error: 'Cupom não encontrado' }
  }

  const result = await apiServer<Coupon>(`/admin/coupons/${id}`, {
    method: 'PATCH',
    body: toWritePayload(parsed.data),
  })
  if (!result.ok) {
    return {
      success: false,
      error: errorMessageOf(
        result.error.statusCode,
        result.error.message,
        'Não foi possível atualizar o cupom',
      ),
    }
  }

  revalidatePath('/admin/coupons')
  return { success: true }
}

export async function deleteCouponAction(id: string) {
  if (!/^\d{1,15}$/.test(id)) {
    return { success: false, error: 'Cupom não encontrado' }
  }

  const result = await apiServer(`/admin/coupons/${id}`, { method: 'DELETE' })
  if (!result.ok) {
    return {
      success: false,
      error: errorMessageOf(
        result.error.statusCode,
        result.error.message,
        'Não foi possível excluir o cupom',
      ),
    }
  }

  revalidatePath('/admin/coupons')
  return { success: true }
}

export async function toggleCouponStatusAction(id: string) {
  if (!/^\d{1,15}$/.test(id)) {
    return { success: false, error: 'Cupom não encontrado' }
  }

  const result = await apiServer<Coupon>(`/admin/coupons/${id}/toggle`, { method: 'POST' })
  if (!result.ok) {
    return {
      success: false,
      error: errorMessageOf(
        result.error.statusCode,
        result.error.message,
        'Não foi possível alterar o status do cupom',
      ),
    }
  }

  revalidatePath('/admin/coupons')
  return { success: true }
}
