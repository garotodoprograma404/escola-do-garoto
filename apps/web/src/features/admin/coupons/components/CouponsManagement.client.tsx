'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { useToast } from '@/shared/hooks/use-toast'
import type { Coupon, CouponCourseOption, CouponStats } from '../types'
import { CouponStats as CouponStatsCards } from './CouponStats'
import { CouponListTable } from './CouponListTable'
import { CouponFormDialog } from './CouponFormDialog.client'
import {
  createCouponAction,
  deleteCouponAction,
  toggleCouponStatusAction,
  updateCouponAction,
} from '../actions/coupon-actions'

interface CouponsManagementProps {
  initialStats: CouponStats
  initialCoupons: Coupon[]
  courseOptions: CouponCourseOption[]
}

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

export function CouponsManagement({
  initialStats,
  initialCoupons,
  courseOptions,
}: CouponsManagementProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreate = async (payload: CouponSubmitPayload) => {
    setFormError(null)
    startTransition(() => {
      void (async () => {
        const result = await createCouponAction(payload)
        if (!result.success) {
          setFormError(result.error || 'Não foi possível criar o cupom')
          return
        }

        setIsCreateOpen(false)
        toast({
          title: 'Cupom criado',
          description: 'Novo cupom criado com sucesso.',
        })
        router.refresh()
      })()
    })
  }

  const handleUpdate = async (payload: CouponSubmitPayload) => {
    if (!editingCoupon) return
    setFormError(null)

    startTransition(() => {
      void (async () => {
        const result = await updateCouponAction(editingCoupon.id, payload)
        if (!result.success) {
          setFormError(result.error || 'Não foi possível atualizar o cupom')
          return
        }

        setEditingCoupon(null)
        toast({
          title: 'Cupom atualizado',
          description: 'As alterações foram salvas.',
        })
        router.refresh()
      })()
    })
  }

  const handleDelete = (couponId: string) => {
    startTransition(() => {
      void (async () => {
        const result = await deleteCouponAction(couponId)
        if (!result.success) {
          toast({
            title: 'Erro ao excluir',
            description: result.error || 'Não foi possível excluir o cupom.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Cupom excluído',
          description: 'O cupom foi removido com sucesso.',
        })
        router.refresh()
      })()
    })
  }

  const confirmDelete = (couponId: string) => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Tem certeza que deseja excluir este cupom?')
      if (!confirmed) {
        return
      }
    }
    handleDelete(couponId)
  }

  const handleToggleStatus = (couponId: string) => {
    startTransition(() => {
      void (async () => {
        const result = await toggleCouponStatusAction(couponId)
        if (!result.success) {
          toast({
            title: 'Erro ao alterar status',
            description: result.error || 'Não foi possível alterar o status.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Status atualizado',
          description: 'Status do cupom alterado com sucesso.',
        })
        router.refresh()
      })()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">
            Gerenciamento de Cupons
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Crie cupons por curso com desconto em percentual ou valor fixo.
          </p>
        </div>
        <Button
          className="bg-brand-500 text-black hover:bg-brand-400"
          onClick={() => {
            setFormError(null)
            setIsCreateOpen(true)
          }}
          disabled={isPending}
        >
          <Plus size={18} className="mr-2" />
          Novo Cupom
        </Button>
      </div>

      <CouponStatsCards stats={initialStats} />

      <CouponListTable
        coupons={initialCoupons}
        onEdit={(coupon) => {
          setFormError(null)
          setEditingCoupon(coupon)
        }}
        onDelete={confirmDelete}
        onToggleStatus={handleToggleStatus}
      />

      <CouponFormDialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) setFormError(null)
        }}
        mode="create"
        courses={courseOptions}
        isSubmitting={isPending}
        error={formError}
        onSubmit={handleCreate}
      />

      <CouponFormDialog
        open={Boolean(editingCoupon)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCoupon(null)
            setFormError(null)
          }
        }}
        mode="edit"
        initialCoupon={editingCoupon}
        courses={courseOptions}
        isSubmitting={isPending}
        error={formError}
        onSubmit={handleUpdate}
      />
    </div>
  )
}
