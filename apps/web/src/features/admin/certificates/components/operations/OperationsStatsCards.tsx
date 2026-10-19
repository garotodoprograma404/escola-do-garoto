import { CheckCircle2, Clock3, RefreshCw, ShieldX } from 'lucide-react'
import { SummaryCard } from '@/features/admin/components/SummaryCard'

interface OperationsStatsCardsProps {
  stats: { total: number; active: number; revoked: number; replaced: number }
}

/** Contadores no topo da operação de certificados. */
export function OperationsStatsCards({ stats }: OperationsStatsCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total emitidos"
        value={stats.total}
        icon={<Clock3 className="h-4 w-4" />}
        caption="Certificados registrados"
      />
      <SummaryCard
        title="Ativos"
        value={stats.active}
        icon={<CheckCircle2 className="h-4 w-4" />}
        caption="Válidos para verificação"
      />
      <SummaryCard
        title="Revogados"
        value={stats.revoked}
        icon={<ShieldX className="h-4 w-4" />}
        caption="Inválidos por revogação"
      />
      <SummaryCard
        title="Substituídos"
        value={stats.replaced}
        icon={<RefreshCw className="h-4 w-4" />}
        caption="Trocados por nova emissão"
      />
    </section>
  )
}
