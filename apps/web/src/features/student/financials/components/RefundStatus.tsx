import type { RefundRequestInfo } from '../types'

const STAGE: Record<RefundRequestInfo['stage'], { label: string; className: string }> = {
  requested: {
    label: 'Reembolso pedido: em análise',
    className: 'text-amber-800 dark:text-amber-300',
  },
  approved: {
    label: 'Reembolso aprovado: estorno em processamento',
    className: 'text-sky-800 dark:text-sky-300',
  },
  completed: {
    label: 'Reembolso concluído',
    className: 'text-green-800 dark:text-green-300',
  },
  rejected: {
    label: 'Reembolso recusado',
    className: 'text-red-800 dark:text-red-300',
  },
}

/** Andamento do pedido de reembolso, mostrado na própria compra. */
export function RefundStatus({ request }: { request: RefundRequestInfo }) {
  const stage = STAGE[request.stage]
  return (
    <div className="text-xs">
      <p className={`font-semibold ${stage.className}`}>{stage.label}</p>
      {request.stage === 'rejected' && request.rejection_reason ? (
        <p className="mt-0.5 text-slate-600 dark:text-slate-400">
          Motivo: {request.rejection_reason}
        </p>
      ) : null}
    </div>
  )
}
