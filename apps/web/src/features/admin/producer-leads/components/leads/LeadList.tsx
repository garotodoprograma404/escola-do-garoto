import { CalendarClock, MapPin, Phone, Search } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { formatDateTime } from '@/shared/lib/format'
import { cn } from '@/shared/lib/utils'
import {
  LEAD_STATUS_OPTIONS,
  formatPhone,
  leadStatusBadgeClass,
  leadStatusLabel,
  type LeadFilterStatus,
} from '../../lib/leadsDisplay'
import type { ProducerLead } from '../../services/producerLeadsService'

interface LeadListProps {
  leads: ProducerLead[]
  selectedLeadId: number | null
  searchTerm: string
  statusFilter: LeadFilterStatus
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: LeadFilterStatus) => void
  onSelect: (leadId: number) => void
}

/** Fila de leads com busca e filtro por situação. */
export function LeadList({
  leads,
  selectedLeadId,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
}: LeadListProps) {
  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Fila de leads</CardTitle>
          <CardDescription>
            Selecione um contato para ver os detalhes e tratar o lead.
          </CardDescription>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome, e-mail, telefone, cidade ou tema..."
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as LeadFilterStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {LEAD_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Nenhum lead encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {leads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => onSelect(lead.id)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  selectedLeadId === lead.id
                    ? 'border-brand-400/70 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {lead.fullName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{lead.email}</p>
                  </div>
                  <Badge variant="outline" className={leadStatusBadgeClass(lead.status)}>
                    {leadStatusLabel(lead.status)}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {lead.message || 'Sem mensagem adicional enviada por esse lead.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {formatPhone(lead.phone)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {lead.city}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(lead.createdAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
