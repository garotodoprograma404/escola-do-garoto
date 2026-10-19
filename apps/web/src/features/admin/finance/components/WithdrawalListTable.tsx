'use client'

import { Eye, CheckCircle, XCircle } from 'lucide-react'
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
import type { WithdrawalRequest, WithdrawalStatus } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface WithdrawalListTableProps {
  withdrawals: WithdrawalRequest[]
  onView: (withdrawal: WithdrawalRequest) => void
}

function getStatusBadge(status: WithdrawalStatus): React.ReactNode {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Aprovado
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pendente
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Rejeitado
        </Badge>
      )
    case 'processing':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Processando
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Concluído
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
          Cancelado
        </Badge>
      )
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function WithdrawalListTable({ withdrawals, onView }: WithdrawalListTableProps) {
  if (withdrawals.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhuma solicitação de saque encontrada.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((withdrawal) => (
            <TableRow
              key={withdrawal.id}
              className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {/* User */}
              <TableCell>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {withdrawal.producerName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {withdrawal.producerEmail || `ID ${withdrawal.producerId.slice(0, 8)}`}
                  </p>
                </div>
              </TableCell>

              {/* Role */}
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {withdrawal.accountScope === 'affiliate' ? 'AFFILIATE' : 'PRODUCER'}
                </Badge>
              </TableCell>

              {/* Method */}
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {withdrawal.method === 'bank_transfer' ? 'TRANSFERÊNCIA' : 'PIX'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {withdrawal.method === 'bank_transfer'
                      ? `Ag ${withdrawal.bankAccount.agency || '-'} CC ${withdrawal.bankAccount.account || '-'}`
                      : withdrawal.bankAccount.holderDocument || 'Chave PIX não informada'}
                  </p>
                </div>
              </TableCell>

              {/* Amount */}
              <TableCell>
                <p className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(withdrawal.amount)}
                </p>
              </TableCell>

              {/* Date */}
              <TableCell>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(withdrawal.requestedAt)}
                </p>
              </TableCell>

              {/* Status */}
              <TableCell className="text-center">{getStatusBadge(withdrawal.status)}</TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                {withdrawal.status === 'pending' ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg bg-green-100 p-2 text-green-700 transition-colors hover:bg-green-200"
                      title="Aprovar"
                      onClick={() => onView(withdrawal)}
                    >
                      <CheckCircle size={18} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg bg-red-100 p-2 text-red-700 transition-colors hover:bg-red-200"
                      title="Rejeitar"
                      onClick={() => onView(withdrawal)}
                    >
                      <XCircle size={18} />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(withdrawal)}
                    className="text-brand-500 hover:text-brand-600"
                  >
                    <Eye size={18} className="mr-2" />
                    Ver
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
