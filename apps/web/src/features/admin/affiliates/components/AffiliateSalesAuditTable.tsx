import { Badge } from '@/shared/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { AffiliateSalesAuditRow } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface AffiliateSalesAuditTableProps {
  rows: AffiliateSalesAuditRow[]
}

function getStatusBadge(status: AffiliateSalesAuditRow['status']) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Disponível
        </Badge>
      )
    case 'pending':
      return <Badge variant="secondary">Pendente</Badge>
    case 'refunded':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Estornada
        </Badge>
      )
    default:
      return <Badge variant="outline">Falha</Badge>
  }
}

export function AffiliateSalesAuditTable({ rows }: AffiliateSalesAuditTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground dark:bg-slate-900">
        Nenhuma venda rastreada para auditoria até o momento.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Afiliado</TableHead>
            <TableHead>Curso</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Comissão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.transactionId}>
              <TableCell>
                <div>
                  <p className="font-medium">{row.affiliateName}</p>
                  <p className="text-xs text-muted-foreground">{row.producerName}</p>
                </div>
              </TableCell>
              <TableCell>{row.courseTitle}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{row.orderPublicId}</p>
                  <p className="text-xs text-muted-foreground">{row.paymentId}</p>
                </div>
              </TableCell>
              <TableCell>{row.affiliateLinkCode || '-'}</TableCell>
              <TableCell>{getStatusBadge(row.status)}</TableCell>
              <TableCell>{new Date(row.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
