'use client'

import { Percent, DollarSign, Calendar, Users, Edit, Trash2, Power } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { Coupon, CouponStatus } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface CouponListTableProps {
  coupons: Coupon[]
  onEdit: (coupon: Coupon) => void
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
}

function getStatusBadge(status: CouponStatus): React.ReactNode {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Ativo
        </Badge>
      )
    case 'inactive':
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800">
          Inativo
        </Badge>
      )
    case 'expired':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Expirado
        </Badge>
      )
    case 'depleted':
      return (
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          Esgotado
        </Badge>
      )
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Sem limite'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function CouponListTable({
  coupons,
  onEdit,
  onDelete,
  onToggleStatus,
}: CouponListTableProps) {
  if (coupons.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum cupom encontrado. Crie o primeiro cupom.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Tipo/Valor</TableHead>
            <TableHead>Uso</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => {
            const usagePercentage = coupon.usageLimit
              ? (coupon.usageCount / coupon.usageLimit) * 100
              : 0

            return (
              <TableRow key={coupon.id}>
                {/* Code */}
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                      {coupon.code}
                    </p>
                    <p className="line-clamp-1 text-sm text-slate-600 dark:text-slate-400">
                      {coupon.description}
                    </p>
                    {coupon.applicableCourseTitles.length > 0 ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {coupon.applicableCourseTitles.join(', ')}
                      </p>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Todos os cursos elegíveis
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Type/Value */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {coupon.type === 'percentage' ? (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <Percent size={18} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {coupon.value}%
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Percentual</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                          <DollarSign size={18} className="text-green-700 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(coupon.value)}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">Fixo</p>
                        </div>
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Usage */}
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-600 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {coupon.usageCount}
                        {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                      </span>
                    </div>
                    {coupon.usageLimit && (
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-2 rounded-full ${
                            usagePercentage >= 90
                              ? 'bg-red-500'
                              : usagePercentage >= 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(usagePercentage, 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Validity */}
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar size={14} />
                      <span>De: {formatDate(coupon.validFrom)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar size={14} />
                      <span>Até: {formatDate(coupon.validUntil)}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>{getStatusBadge(coupon.status)}</TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(coupon.id)}
                      title={coupon.status === 'active' ? 'Desativar' : 'Ativar'}
                    >
                      <Power
                        size={18}
                        className={coupon.status === 'active' ? 'text-green-600' : 'text-slate-400'}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(coupon)}
                      aria-label={`Editar cupom ${coupon.code}`}
                    >
                      <Edit size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(coupon.id)}
                      aria-label={`Excluir cupom ${coupon.code}`}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
