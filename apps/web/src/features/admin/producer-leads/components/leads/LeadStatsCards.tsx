import { MessageSquareText, UserCheck2, Users, Video } from 'lucide-react'
import { SummaryCard } from '@/features/admin/components/SummaryCard'

interface LeadStatsCardsProps {
  stats: { total: number; newCount: number; contactedCount: number; withRecordedContent: number }
}

/** Contadores no topo da fila de leads de produtor. */
export function LeadStatsCards({ stats }: LeadStatsCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Total de contatos"
        value={stats.total}
        icon={<Users className="h-4 w-4" />}
        caption="Leads recebidos via /become-producer"
      />
      <SummaryCard
        title="Novos leads"
        value={stats.newCount}
        icon={<MessageSquareText className="h-4 w-4" />}
        caption="Aguardando primeiro contato"
      />
      <SummaryCard
        title="Leads contatados"
        value={stats.contactedCount}
        icon={<UserCheck2 className="h-4 w-4" />}
        caption="Em acompanhamento pelo time"
      />
      <SummaryCard
        title="Com conteúdo gravado"
        value={stats.withRecordedContent}
        icon={<Video className="h-4 w-4" />}
        caption="Leads com material inicial pronto"
      />
    </section>
  )
}
