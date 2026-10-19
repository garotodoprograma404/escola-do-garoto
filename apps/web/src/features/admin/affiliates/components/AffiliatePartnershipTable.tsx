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
import type { AffiliatePartnershipListItem } from '../types'

interface AffiliatePartnershipTableProps {
  partnerships: AffiliatePartnershipListItem[]
  onEdit: (partnership: AffiliatePartnershipListItem) => void
  onReview: (
    partnership: AffiliatePartnershipListItem,
    status: 'approved' | 'rejected' | 'revoked',
  ) => void
}

function getStatusBadge(status: AffiliatePartnershipListItem['status']) {
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Aprovada
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Rejeitada
        </Badge>
      )
    case 'revoked':
      return (
        <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          Revogada
        </Badge>
      )
    default:
      return <Badge variant="secondary">Pendente</Badge>
  }
}

function formatDate(date: string | null): string | null {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function AffiliatePartnershipTable({
  partnerships,
  onEdit,
  onReview,
}: AffiliatePartnershipTableProps) {
  if (partnerships.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground dark:bg-slate-900">
        Nenhuma parceria cadastrada até o momento.
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
            <TableHead>Status</TableHead>
            <TableHead>Operação</TableHead>
            <TableHead>Comissão</TableHead>
            <TableHead>Janela</TableHead>
            <TableHead>Links</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partnerships.map((partnership) => (
            <TableRow key={partnership.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{partnership.affiliateName}</p>
                  <p className="text-xs text-muted-foreground">{partnership.affiliateEmail}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{partnership.courseTitle}</p>
                  <p className="text-xs text-muted-foreground">{partnership.producerName}</p>
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(partnership.status)}</TableCell>
              <TableCell>
                <div className="space-y-2">
                  {partnership.approvedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Aprovada em {formatDate(partnership.approvedAt)}
                    </p>
                  ) : partnership.reviewedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Revisada em {formatDate(partnership.reviewedAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ainda sem revisão final</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {partnership.rejectionReason ? (
                      <Badge variant="destructive">Tem motivo de rejeição</Badge>
                    ) : null}
                    {partnership.notes ? (
                      <Badge variant="outline">Tem nota operacional</Badge>
                    ) : null}
                  </div>

                  {partnership.rejectionReason ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {partnership.rejectionReason}
                    </p>
                  ) : partnership.notes ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {partnership.notes}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>{partnership.commissionRate.toFixed(2)}%</TableCell>
              <TableCell>{partnership.cookieWindowDays} dias</TableCell>
              <TableCell>{partnership.linksCount}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(partnership)}>
                    Editar
                  </Button>
                  {partnership.status !== 'approved' ? (
                    <Button size="sm" onClick={() => onReview(partnership, 'approved')}>
                      Aprovar
                    </Button>
                  ) : null}
                  {partnership.status !== 'rejected' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReview(partnership, 'rejected')}
                    >
                      Rejeitar
                    </Button>
                  ) : null}
                  {partnership.status !== 'revoked' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReview(partnership, 'revoked')}
                    >
                      Revogar
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
