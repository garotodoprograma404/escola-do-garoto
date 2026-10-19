'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ShieldX, TimerReset } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Label } from '@/shared/components/ui/label'
import { Separator } from '@/shared/components/ui/separator'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import {
  reissueCertificateAction,
  revokeIssuedCertificateAction,
} from '../../actions/certificate-operations-actions'
import {
  toIssueModeLabel,
  toStatusBadgeClass,
  toStatusLabel,
} from '../../lib/certificateOperationsDisplay'
import { formatDateTime } from '@/shared/lib/format'
import type {
  AdminCertificateEvent,
  AdminIssuedCertificate,
} from '../../services/certificateOperationsService'
import { CertificateAuditHistory } from './CertificateAuditHistory'

interface CertificateOperationsDetailsProps {
  certificate: AdminIssuedCertificate | null
  events: AdminCertificateEvent[]
}

/** Detalhes do certificado selecionado: revogar, reemitir (com motivo) e o histórico de auditoria. */
export function CertificateOperationsDetails({
  certificate,
  events,
}: CertificateOperationsDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [reason, setReason] = useState(certificate?.revokedReason || '')

  // Trocou de certificado (ou os dados foram recarregados): o motivo volta ao que está salvo.
  useEffect(() => {
    setReason(certificate?.revokedReason || '')
  }, [certificate])

  const run = (
    action: (certificate: AdminIssuedCertificate) => Promise<{
      success: boolean
      error?: string
      message?: string
      certificateCode?: string | null
    }>,
    messages: { errorTitle: string; successTitle: string },
  ) => {
    if (!certificate) return

    startTransition(async () => {
      const result = await action(certificate)

      if (!result.success) {
        toast({ title: messages.errorTitle, description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title: messages.successTitle,
        description: result.certificateCode
          ? `${result.message} (${result.certificateCode})`
          : result.message,
      })
      router.refresh()
    })
  }

  const canRevoke = certificate?.status === 'active' && reason.trim().length >= 5

  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader>
        <CardTitle>Detalhes e auditoria</CardTitle>
        <CardDescription>
          Controle operacional do certificado selecionado e histórico de eventos da matrícula.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!certificate ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Selecione um certificado para visualizar detalhes operacionais.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {certificate.studentName}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {certificate.courseTitle}
                  </p>
                </div>

                <Badge variant="outline" className={toStatusBadgeClass(certificate.status)}>
                  {toStatusLabel(certificate.status)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-mono text-slate-700 dark:text-slate-300">{certificate.code}</p>
                <p>Emissão: {formatDateTime(certificate.issuedAt)}</p>
                <p>Modo: {toIssueModeLabel(certificate.issueMode)}</p>
                <p>Revogado em: {formatDateTime(certificate.revokedAt)}</p>
                <p>Motivo atual: {certificate.revokedReason || 'Não informado'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate-operation-reason">Motivo / observação operacional</Label>
              <Textarea
                id="certificate-operation-reason"
                rows={4}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex.: erro no nome, solicitação formal, correção de dados, compliance..."
              />
              <p className="text-right text-xs text-slate-600 dark:text-slate-400">
                {reason.length}/500 caracteres
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                disabled={isPending || !canRevoke}
                className="min-w-[140px]"
                onClick={() =>
                  run(
                    (target) => revokeIssuedCertificateAction({ certificateId: target.id, reason }),
                    {
                      errorTitle: 'Erro ao revogar certificado',
                      successTitle: 'Certificado revogado',
                    },
                  )
                }
              >
                <ShieldX className="mr-2 h-4 w-4" />
                Revogar
              </Button>

              <Button
                variant="outline"
                disabled={isPending}
                className="min-w-[140px]"
                onClick={() =>
                  run((target) => reissueCertificateAction({ certificateId: target.id, reason }), {
                    errorTitle: 'Erro ao reemitir certificado',
                    successTitle: 'Certificado reemitido',
                  })
                }
              >
                <TimerReset className="mr-2 h-4 w-4" />
                Reemitir
              </Button>

              <Button asChild variant="outline">
                <Link
                  href={`/certificates/verify?code=${encodeURIComponent(certificate.code)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Validar público
                </Link>
              </Button>
            </div>

            <Separator />

            <CertificateAuditHistory events={events} />

            {certificate.status !== 'active' ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="inline-flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                  Certificados não ativos continuam no histórico, mas não são considerados válidos
                  na verificação pública.
                </p>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
