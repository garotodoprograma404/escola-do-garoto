'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { formatCurrency } from '@/shared/lib/utils'
import { approveRefundAction, rejectRefundAction } from '../actions/refund-actions'
import type { AdminRefundRequest, RefundStage } from '../types'

const STAGE: Record<RefundStage, { label: string; className: string }> = {
  requested: {
    label: 'Aguardando decisão',
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  },
  approved: {
    label: 'Aprovado: aguardando estorno',
    className: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200',
  },
  completed: {
    label: 'Estornado',
    className: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200',
  },
  rejected: {
    label: 'Recusado',
    className: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
}

const GATEWAY: Record<AdminRefundRequest['gateway'], string> = {
  mercadopago: 'Mercado Pago',
  simulator: 'Simulador (demonstração)',
  manual: 'Fora do sistema',
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR') : '—'
}

function isOpen(refund: AdminRefundRequest) {
  return refund.stage === 'requested' || refund.stage === 'approved'
}

/**
 * Fila de reembolsos: aprovar pede o estorno ao meio de pagamento (a API tira o acesso, o
 * certificado e as comissões quando o estorno é confirmado); recusar exige motivo, que o aluno vê.
 */
export function RefundRequestsPanel({ refunds }: { refunds: AdminRefundRequest[] }) {
  const [showAll, setShowAll] = useState(false)
  const openCount = refunds.filter(isOpen).length
  const visible = showAll ? refunds : refunds.filter(isOpen)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          O aluno pode pedir até 7 dias depois da compra. Aprovado, o valor volta pelo mesmo meio de
          pagamento e a comissão do produtor e do afiliado é descontada.
        </p>
        <div className="flex gap-2" role="group" aria-label="Filtrar pedidos de reembolso">
          <Button
            size="sm"
            variant={showAll ? 'outline' : 'default'}
            aria-pressed={!showAll}
            onClick={() => setShowAll(false)}
          >
            Em aberto ({openCount})
          </Button>
          <Button
            size="sm"
            variant={showAll ? 'default' : 'outline'}
            aria-pressed={showAll}
            onClick={() => setShowAll(true)}
          >
            Todos ({refunds.length})
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {showAll ? 'Nenhum pedido de reembolso ainda.' : 'Nenhum pedido de reembolso em aberto.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((refund) => (
            <RefundCard key={refund.id} refund={refund} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RefundCard({ refund }: { refund: AdminRefundRequest }) {
  const stage = STAGE[refund.stage]
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            {refund.purchase.course_titles}
          </p>
          <p className="break-words text-sm text-slate-600 dark:text-slate-400">
            {refund.student.name} · {refund.student.email}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatCurrency(refund.amount)}
          </p>
          <Badge className={stage.className}>{stage.label}</Badge>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-600 dark:text-slate-400">Compra</dt>
          <dd>{formatDate(refund.purchase.purchased_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">Pedido de reembolso</dt>
          <dd>{formatDate(refund.requested_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-600 dark:text-slate-400">Estorno por</dt>
          <dd>{GATEWAY[refund.gateway]}</dd>
        </div>
      </dl>

      {refund.reason ? (
        <blockquote className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-800 dark:bg-slate-950 dark:text-slate-200">
          <span className="font-semibold">Motivo do aluno: </span>
          {refund.reason}
        </blockquote>
      ) : null}

      {refund.stage === 'rejected' && refund.rejection_reason ? (
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold">Motivo da recusa: </span>
          {refund.rejection_reason}
        </p>
      ) : null}

      {refund.stage === 'approved' ? (
        <p className="mt-3 text-sm text-sky-900 dark:text-sky-200">
          O estorno foi pedido ao Mercado Pago e é concluído sozinho quando ele confirmar. Se
          demorar, tente de novo: o mesmo estorno nunca é feito duas vezes. Se ele não vai
          acontecer, encerre o pedido explicando.
        </p>
      ) : null}

      {refund.gateway === 'manual' && refund.stage === 'requested' ? (
        <p className="mt-3 text-sm text-amber-900 dark:text-amber-200">
          Esta compra não passou pelo Mercado Pago: devolva o valor por fora e recuse o pedido
          explicando ao aluno.
        </p>
      ) : null}

      {isOpen(refund) ? <RefundActions refund={refund} /> : null}
    </li>
  )
}

function RefundActions({ refund }: { refund: AdminRefundRequest }) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  function approve() {
    startTransition(async () => {
      const result = await approveRefundAction(refund.id)
      if (!result.success) {
        toast({ title: 'Estorno não concluído', description: result.error, variant: 'destructive' })
        return
      }
      toast(
        result.data.result === 'refunded'
          ? {
              title: 'Reembolso concluído',
              description: 'O valor foi estornado e o aluno foi avisado.',
            }
          : {
              title: 'Estorno pedido',
              description: 'O Mercado Pago vai confirmar em instantes; o pedido conclui sozinho.',
            },
      )
      router.refresh()
    })
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectRefundAction(refund.id, reason)
      if (!result.success) {
        toast({ title: 'Erro ao recusar', description: result.error, variant: 'destructive' })
        return
      }
      setRejectOpen(false)
      setReason('')
      toast({ title: 'Reembolso recusado', description: 'O aluno foi avisado com o motivo.' })
      router.refresh()
    })
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" disabled={pending}>
            <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
            {refund.stage === 'approved' ? 'Tentar o estorno de novo' : 'Aprovar e estornar'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estornar {formatCurrency(refund.amount)}?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor volta para {refund.student.name} pelo mesmo meio de pagamento. Quando o
              estorno for confirmado, o acesso ao curso e o certificado desta compra são revogados e
              a comissão do produtor e do afiliado é descontada do saldo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approve}>Estornar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isOpen(refund) ? (
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={pending}>
              <XCircle aria-hidden="true" className="mr-2 h-4 w-4" />
              {refund.stage === 'approved' ? 'Encerrar sem estorno' : 'Recusar'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                reject()
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  {refund.stage === 'approved' ? 'Encerrar sem estorno' : 'Recusar o reembolso'}
                </DialogTitle>
                <DialogDescription>
                  {refund.stage === 'approved'
                    ? 'Use só se o Mercado Pago não vai fazer o estorno (por exemplo, o valor foi devolvido por fora). O aluno recebe o motivo no sino e na compra.'
                    : 'O aluno recebe o motivo no sino e na própria compra.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                <Label htmlFor={`reject-reason-${refund.id}`}>Motivo da recusa</Label>
                <Textarea
                  id={`reject-reason-${refund.id}`}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Mínimo de 10 caracteres
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Recusando...' : 'Recusar pedido'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
