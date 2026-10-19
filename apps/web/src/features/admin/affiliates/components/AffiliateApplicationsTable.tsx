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
import type { AffiliateApplicationListItem } from '../types'

interface AffiliateApplicationsTableProps {
  applications: AffiliateApplicationListItem[]
  onReview: (application: AffiliateApplicationListItem) => void
  onCreatePartnership: (application: AffiliateApplicationListItem) => void
}

function statusLabel(status: AffiliateApplicationListItem['status']): string {
  switch (status) {
    case 'under_review':
      return 'Em análise'
    case 'approved':
      return 'Aprovada'
    case 'rejected':
      return 'Rejeitada'
    default:
      return 'Pendente'
  }
}

function statusVariant(
  status: AffiliateApplicationListItem['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default'
    case 'rejected':
      return 'destructive'
    case 'under_review':
      return 'secondary'
    default:
      return 'outline'
  }
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function AffiliateApplicationsTable({
  applications,
  onReview,
  onCreatePartnership,
}: AffiliateApplicationsTableProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-sm text-muted-foreground dark:bg-slate-900">
        Nenhuma candidatura de afiliado encontrada.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidato</TableHead>
            <TableHead>Canais</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Operação</TableHead>
            <TableHead>Enviado em</TableHead>
            <TableHead>Revisado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{application.fullName}</p>
                  <p className="text-xs text-muted-foreground">{application.email}</p>
                  <p className="text-xs text-muted-foreground">{application.phone}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {application.promotionChannels.length > 0 ? (
                    application.promotionChannels.map((channel) => (
                      <Badge key={channel} variant="secondary">
                        {channel}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Sem canais informados</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(application.status)}>
                  {statusLabel(application.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {application.hasAffiliateRole ? (
                    <Badge>Acesso liberado</Badge>
                  ) : (
                    <Badge variant="outline">Sem acesso</Badge>
                  )}
                  {application.hasAffiliateRole && application.approvedPartnershipCount === 0 ? (
                    <Badge variant="secondary">Aguardando primeira parceria</Badge>
                  ) : null}
                  <Badge variant="secondary">
                    {application.partnershipCount} parceria
                    {application.partnershipCount === 1 ? '' : 's'}
                  </Badge>
                  <Badge variant="secondary">
                    {application.approvedPartnershipCount} aprovada
                    {application.approvedPartnershipCount === 1 ? '' : 's'}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{formatDate(application.createdAt)}</TableCell>
              <TableCell>
                {application.reviewedAt ? (
                  formatDate(application.reviewedAt)
                ) : (
                  <span className="text-xs text-muted-foreground">Aguardando</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onReview(application)}>
                    {application.status === 'approved' ? 'Ver revisão' : 'Revisar'}
                  </Button>
                  {application.hasAffiliateRole ? (
                    <Button size="sm" onClick={() => onCreatePartnership(application)}>
                      {application.approvedPartnershipCount === 0
                        ? 'Criar 1ª parceria'
                        : 'Nova parceria'}
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
