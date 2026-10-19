import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Download, CheckCircle } from 'lucide-react'
import type { StudentTransaction } from '../types'
import { RefundButton } from './RefundButton.client'
import { RefundStatus } from './RefundStatus'

interface PurchaseHistoryProps {
  transactions: StudentTransaction[]
  onDownloadInvoice?: (transactionId: string) => void
}

export function PurchaseHistory({ transactions, onDownloadInvoice }: PurchaseHistoryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const config = {
      completed: {
        label: 'Pago',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      },
      pending: {
        label: 'Pendente',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      refunded: {
        label: 'Reembolsado',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      },
      failed: {
        label: 'Falhou',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      },
    }

    const statusConfig = config[status as keyof typeof config] || config.pending

    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Compras</CardTitle>
          <CardDescription>Suas transações e compras de cursos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
        <CardTitle>Histórico de Compras</CardTitle>
        <CardDescription>{transactions.length} transação(ões)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
        <div className="space-y-3 md:hidden">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="space-y-3 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{transaction.course_title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Instrutor: {transaction.producer_name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Ref: {transaction.id}</p>
                </div>
                <p className="shrink-0 text-sm font-bold">{formatCurrency(transaction.amount)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDate(transaction.created_at)}</span>
                <span>•</span>
                <span>{transaction.payment_method}</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {transaction.status === 'completed' && <CheckCircle size={12} />}
                  {getStatusBadge(transaction.status)}
                </div>
                {transaction.status === 'completed' && onDownloadInvoice && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownloadInvoice(transaction.id)}
                    className="h-8 px-2 text-xs font-bold text-brand-600 hover:text-brand-500 dark:text-brand-400"
                  >
                    <Download size={14} className="mr-1" />
                    PDF
                  </Button>
                )}
              </div>
              <RefundArea transaction={transaction} />
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-950">
                <TableHead>Detalhes do Curso</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Comprovante e reembolso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow
                  key={transaction.id}
                  className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {/* Course Details */}
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {transaction.course_title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <span>Instrutor: {transaction.producer_name}</span>
                        <span>•</span>
                        <span className="font-mono">Ref: {transaction.id}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(transaction.created_at)}
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="font-bold text-slate-900 dark:text-white">
                    {formatCurrency(transaction.amount)}
                  </TableCell>

                  {/* Payment Method */}
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300">
                    {transaction.payment_method}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {transaction.status === 'completed' && <CheckCircle size={12} />}
                      {getStatusBadge(transaction.status)}
                    </div>
                  </TableCell>

                  {/* Comprovante e reembolso */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      {transaction.status === 'completed' && onDownloadInvoice && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadInvoice(transaction.id)}
                          className="flex items-center justify-end gap-1 text-xs font-bold text-brand-600 hover:text-brand-500 dark:text-brand-400"
                        >
                          <Download size={14} /> Baixar PDF
                        </Button>
                      )}
                      <RefundArea transaction={transaction} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/** Botão de pedir reembolso (dentro do prazo) ou o andamento do pedido já feito. */
function RefundArea({ transaction }: { transaction: StudentTransaction }) {
  if (transaction.refund_request) return <RefundStatus request={transaction.refund_request} />
  if (!transaction.refund_deadline) return null
  return (
    <RefundButton
      transactionId={transaction.id}
      courseTitle={transaction.course_title}
      deadline={transaction.refund_deadline}
    />
  )
}
