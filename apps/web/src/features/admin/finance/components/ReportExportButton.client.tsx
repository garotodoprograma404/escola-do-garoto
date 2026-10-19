'use client'

import { useState } from 'react'
import { Download, Calendar } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Label } from '@/shared/components/ui/label'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { exportFinancialReportAction } from '../actions/export-report'
import { useToast } from '@/shared/hooks/use-toast'

export function ReportExportButton() {
  const [open, setOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { toast } = useToast()

  const handleExport = async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: 'Erro',
        description: 'Selecione o período do relatório',
        variant: 'destructive',
      })
      return
    }

    setIsExporting(true)

    try {
      const result = await exportFinancialReportAction({
        format,
        dateFrom,
        dateTo,
      })

      if ('error' in result) {
        toast({
          title: 'Erro ao exportar',
          description: result.error,
          variant: 'destructive',
        })
      } else {
        // Download do arquivo
        const link = document.createElement('a')
        link.href = result.url
        link.download =
          result.filename || `relatorio-financeiro-${format}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
          title: 'Relatório exportado',
          description: 'O download iniciará automaticamente',
        })

        setOpen(false)
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao exportar relatório',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Definir datas padrão (último mês)
  const setLastMonth = () => {
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

    setDateFrom(lastMonth.toISOString().split('T')[0])
    setDateTo(lastMonthEnd.toISOString().split('T')[0])
  }

  const setCurrentMonth = () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    setDateFrom(firstDay.toISOString().split('T')[0])
    setDateTo(today.toISOString().split('T')[0])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download size={18} />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar Relatório Financeiro</DialogTitle>
          <DialogDescription>Selecione o período e formato do relatório</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={setLastMonth}>
              Último Mês
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={setCurrentMonth}>
              Mês Atual
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Inicial</Label>
              <div className="relative">
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Final</Label>
              <div className="relative">
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as 'pdf' | 'excel')}>
              <SelectTrigger aria-label="Formato do relatório">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel (XLSX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-400">O relatório incluirá:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <li>Métricas financeiras consolidadas</li>
              <li>Histórico de transações</li>
              <li>Solicitações de saque</li>
              <li>Análise de receitas e despesas</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !dateFrom || !dateTo}>
            {isExporting ? (
              <>
                <Download className="mr-2 h-4 w-4 animate-pulse" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
