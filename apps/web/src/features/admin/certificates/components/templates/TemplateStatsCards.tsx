import { CheckCircle2, Layers, Link2, Workflow } from 'lucide-react'
import { SummaryCard } from '@/features/admin/components/SummaryCard'

interface TemplateStatsCardsProps {
  stats: { total: number; draftCount: number; publishedCount: number; activeBindings: number }
}

/** Quatro contadores no topo da tela de modelos. */
export function TemplateStatsCards({ stats }: TemplateStatsCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total de templates"
        value={stats.total}
        icon={<Layers className="h-4 w-4" />}
        caption="Modelos cadastrados no módulo admin"
      />
      <SummaryCard
        title="Templates em rascunho"
        value={stats.draftCount}
        icon={<Workflow className="h-4 w-4" />}
        caption="Aguardando revisão e publicação"
      />
      <SummaryCard
        title="Templates publicados"
        value={stats.publishedCount}
        icon={<CheckCircle2 className="h-4 w-4" />}
        caption="Prontos para uso na emissão"
      />
      <SummaryCard
        title="Vínculos ativos"
        value={stats.activeBindings}
        icon={<Link2 className="h-4 w-4" />}
        caption="Cursos conectados aos templates"
      />
    </section>
  )
}
