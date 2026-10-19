import { User2 } from 'lucide-react'
import { toEventLabel } from '../../lib/certificateOperationsDisplay'
import { formatDateTime } from '@/shared/lib/format'
import type { AdminCertificateEvent } from '../../services/certificateOperationsService'

/** Linha do tempo dos eventos da matrícula (emissão, reemissão, revogação). */
export function CertificateAuditHistory({ events }: { events: AdminCertificateEvent[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Histórico de auditoria</p>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Sem eventos registrados para esta matrícula.
        </div>
      ) : (
        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {toEventLabel(event.eventType)}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {formatDateTime(event.eventAt)}
                </p>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <User2 className="h-3.5 w-3.5" />
                  {event.actorName || event.actorUserId || 'Sistema'}
                </span>
                <span>
                  {event.previousStatus || '-'} {'->'} {event.newStatus || '-'}
                </span>
              </div>

              {event.reason ? (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{event.reason}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
