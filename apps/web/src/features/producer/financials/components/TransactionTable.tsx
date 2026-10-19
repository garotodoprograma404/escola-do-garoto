// =====================================================
// PRODUCER FINANCIALS - TRANSACTION TABLE (Server Component)
// =====================================================

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowDownRight, ArrowUpRight, RefreshCw, DollarSign } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import type { Transaction } from '../types'

interface TransactionTableProps {
  transactions: Transaction[]
}

const typeConfig = {
  sale: {
    label: 'Venda',
    icon: ArrowUpRight,
    color: 'text-green-600',
  },
  withdrawal: {
    label: 'Saque',
    icon: ArrowDownRight,
    color: 'text-red-600',
  },
  refund: {
    label: 'Reembolso',
    icon: RefreshCw,
    color: 'text-orange-600',
  },
  commission: {
    label: 'Comissão',
    icon: DollarSign,
    color: 'text-blue-600',
  },
}

const statusConfig = {
  completed: { label: 'Concluído', variant: 'default' as const },
  pending: { label: 'Pendente', variant: 'secondary' as const },
  processing: { label: 'Processando', variant: 'outline' as const },
  failed: { label: 'Falhou', variant: 'destructive' as const },
  refunded: { label: 'Estornado', variant: 'outline' as const },
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Nenhuma transação encontrada</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const config = typeConfig[transaction.type]
            const Icon = config.icon
            const statusInfo = statusConfig[transaction.status]

            return (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {format(new Date(transaction.created_at), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <span className="text-sm">{config.label}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{transaction.description}</p>
                    {transaction.course_title && (
                      <p className="text-xs text-muted-foreground">{transaction.course_title}</p>
                    )}
                    {transaction.student_name && (
                      <p className="text-xs text-muted-foreground">
                        Aluno: {transaction.student_name}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {transaction.amount >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(transaction.amount)}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
