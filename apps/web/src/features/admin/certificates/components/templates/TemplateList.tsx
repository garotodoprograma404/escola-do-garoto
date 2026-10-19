import { CalendarClock, FileText, Link2, Plus, Search } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
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
import { cn } from '@/shared/lib/utils'
import { formatDateTime } from '@/shared/lib/format'
import {
  TEMPLATE_STATUS_OPTIONS,
  statusBadgeClass,
  statusLabel,
  type TemplateFilterStatus,
} from '../../lib/templateDisplay'
import type { AdminCertificateTemplate } from '../../services/certificateTemplateService'

interface TemplateListProps {
  templates: AdminCertificateTemplate[]
  selectedTemplateId: number | null
  searchTerm: string
  statusFilter: TemplateFilterStatus
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: TemplateFilterStatus) => void
  onSelect: (templateId: number) => void
  onCreate: () => void
}

/** Lista de modelos com busca, filtro por situação e o botão "Novo template". */
export function TemplateList({
  templates,
  selectedTemplateId,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
  onCreate,
}: TemplateListProps) {
  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Lista de templates</CardTitle>
            <CardDescription>
              Selecione um template para editar metadados e controlar o status.
            </CardDescription>
          </div>

          <Button onClick={onCreate} className="bg-brand-500 text-black hover:bg-brand-400">
            <Plus className="mr-2 h-4 w-4" />
            Novo template
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome, descrição ou formato da página..."
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as TemplateFilterStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {TEMPLATE_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Nenhum template encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  selectedTemplateId === template.id
                    ? 'border-brand-400/70 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {template.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Orientação {template.orientation} • {template.pageSize}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusBadgeClass(template.status)}>
                    {statusLabel(template.status)}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {template.description || 'Sem descrição adicional para este template.'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />v{template.latestVersionNumber || 0} (
                    {template.versionCount} versões)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Link2 className="h-3.5 w-3.5" />
                    {template.activeCourseLinks} cursos vinculados
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Atualizado em {formatDateTime(template.updatedAt)}
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
