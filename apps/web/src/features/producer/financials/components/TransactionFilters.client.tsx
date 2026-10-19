// =====================================================
// PRODUCER FINANCIALS - TRANSACTION FILTERS (Client Component)
// =====================================================

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { TransactionFilter, DateRangeFilter } from '../types'

interface TransactionFiltersProps {
  basePath?: string
}

export function TransactionFilters({ basePath = '/producer/financials' }: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentType = (searchParams.get('type') as TransactionFilter) || 'all'
  const currentRange = (searchParams.get('range') as DateRangeFilter) || '30d'

  const handleTypeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', value)
    router.push(`?${params.toString()}`)
  }

  const handleRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', value)
    router.push(`?${params.toString()}`)
  }

  const handleReset = () => {
    router.push(basePath)
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Select value={currentType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Tipo de transação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="sale">Vendas</SelectItem>
          <SelectItem value="withdrawal">Saques</SelectItem>
          <SelectItem value="refund">Reembolsos</SelectItem>
          <SelectItem value="commission">Comissões</SelectItem>
        </SelectContent>
      </Select>

      <Select value={currentRange} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="30d">Últimos 30 dias</SelectItem>
          <SelectItem value="90d">Últimos 90 dias</SelectItem>
          <SelectItem value="all">Todo período</SelectItem>
        </SelectContent>
      </Select>

      {(currentType !== 'all' || currentRange !== '30d') && (
        <Button variant="outline" onClick={handleReset}>
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
