'use client'

import { useState, useTransition } from 'react'
import { Check, X } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { reviewProducerApplicationAction } from '../actions/review-producer-application'
import type {
  AdminProducerApplication,
  ProducerApplicationStatus,
} from '../services/producerApplicationsService'

const STATUS_LABELS: Record<ProducerApplicationStatus, string> = {
  pending: 'Recebida',
  under_review: 'Em análise',
  approved: 'Aprovada',
  rejected: 'Recusada',
}

interface ProducerApplicationsTableProps {
  applications: AdminProducerApplication[]
}

export function ProducerApplicationsTable({ applications }: ProducerApplicationsTableProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [reason, setReason] = useState('')

  function review(applicationId: number, decision: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await reviewProducerApplicationAction({
        applicationId,
        decision,
        rejectionReason: decision === 'rejected' ? reason.trim() : undefined,
      })

      if (result.error) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      setRejectingId(null)
      setReason('')
      toast({
        title: decision === 'approved' ? 'Produtor aprovado' : 'Candidatura recusada',
        description:
          decision === 'approved'
            ? 'O painel de produtor foi liberado para a pessoa.'
            : 'A pessoa vê o motivo na página da candidatura.',
      })
    })
  }

  if (applications.length === 0) {
    return (
      <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        Nenhuma candidatura de produtor recebida.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidato</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Apresentação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => {
            const open = application.status === 'pending' || application.status === 'under_review'

            return (
              <TableRow key={application.id}>
                <TableCell className="align-top">
                  <p className="font-medium">{application.fullName}</p>
                  <p className="text-xs text-muted-foreground">{application.email}</p>
                  <p className="text-xs text-muted-foreground">{application.phone}</p>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {application.expertiseArea}
                  <p className="text-xs text-muted-foreground">
                    {application.experienceYears} anos de experiência
                  </p>
                </TableCell>
                <TableCell className="max-w-md align-top text-sm text-muted-foreground">
                  <p>{application.bio}</p>
                  <p className="mt-2">{application.whyProduce}</p>
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={application.status === 'approved' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[application.status]}
                  </Badge>
                  {application.rejectionReason ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {application.rejectionReason}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right align-top">
                  {open && rejectingId === application.id ? (
                    <div className="ml-auto flex max-w-xs flex-col gap-2">
                      <Textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Motivo da recusa (aparece para a pessoa)"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectingId(null)}
                          disabled={isPending}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isPending || reason.trim().length < 3}
                          onClick={() => review(application.id, 'rejected')}
                        >
                          Confirmar recusa
                        </Button>
                      </div>
                    </div>
                  ) : open ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => review(application.id, 'approved')}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setRejectingId(application.id)}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Recusar
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
