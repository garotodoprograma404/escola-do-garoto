import { Badge } from '@/shared/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { AffiliateAdminListItem } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface AffiliateOverviewTableProps {
  affiliates: AffiliateAdminListItem[]
}

export function AffiliateOverviewTable({ affiliates }: AffiliateOverviewTableProps) {
  if (affiliates.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground dark:bg-slate-900">
        Nenhum afiliado encontrado.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Afiliado</TableHead>
            <TableHead>Parcerias</TableHead>
            <TableHead>Vendas</TableHead>
            <TableHead>Comissão Pendente</TableHead>
            <TableHead>Comissão Disponível</TableHead>
            <TableHead className="text-right">Comissão Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {affiliates.map((affiliate) => (
            <TableRow key={affiliate.affiliateId}>
              <TableCell>
                <div>
                  <p className="font-medium">{affiliate.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {affiliate.email || affiliate.affiliateId}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{affiliate.partnershipCount}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {affiliate.approvedPartnershipCount} aprovadas
                  </span>
                </div>
              </TableCell>
              <TableCell>{affiliate.trackedSalesCount}</TableCell>
              <TableCell>{formatCurrency(affiliate.pendingCommission)}</TableCell>
              <TableCell>{formatCurrency(affiliate.availableCommission)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(affiliate.totalCommission)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
