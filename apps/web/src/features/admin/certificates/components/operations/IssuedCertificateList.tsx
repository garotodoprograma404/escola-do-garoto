import { Search } from 'lucide-react'
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
import { cn } from '@/shared/lib/utils'
import {
  FILTER_STATUS_OPTIONS,
  toIssueModeLabel,
  toStatusBadgeClass,
  toStatusLabel,
  type CertificateFilterStatus,
} from '../../lib/certificateOperationsDisplay'
import { formatDateTime } from '@/shared/lib/format'
import type { AdminIssuedCertificate } from '../../services/certificateOperationsService'

interface IssuedCertificateListProps {
  certificates: AdminIssuedCertificate[]
  selectedCertificateId: number | null
  searchTerm: string
  statusFilter: CertificateFilterStatus
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: CertificateFilterStatus) => void
  onSelect: (certificateId: number) => void
}

/** Lista de certificados emitidos, com busca e filtro por situação. */
export function IssuedCertificateList({
  certificates,
  selectedCertificateId,
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelect,
}: IssuedCertificateListProps) {
  return (
    <Card className="border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/85">
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>Operação de certificados</CardTitle>
          <CardDescription>
            Selecione um certificado emitido para revogar, reemitir e acompanhar auditoria.
          </CardDescription>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por código, aluno, curso ou modo..."
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as CertificateFilterStatus)}
          >
            <SelectTrigger aria-label="Filtrar por situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {certificates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            Nenhum certificado encontrado para os filtros aplicados.
          </div>
        ) : (
          <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
            {certificates.map((certificate) => (
              <button
                key={certificate.id}
                type="button"
                onClick={() => onSelect(certificate.id)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-colors',
                  selectedCertificateId === certificate.id
                    ? 'border-brand-400/70 bg-brand-50 dark:border-brand-500/60 dark:bg-brand-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {certificate.studentName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {certificate.courseTitle}
                    </p>
                  </div>
                  <Badge variant="outline" className={toStatusBadgeClass(certificate.status)}>
                    {toStatusLabel(certificate.status)}
                  </Badge>
                </div>

                <p className="mt-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                  {certificate.code}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span>Emissão: {formatDateTime(certificate.issuedAt)}</span>
                  <span>Modo: {toIssueModeLabel(certificate.issueMode)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
