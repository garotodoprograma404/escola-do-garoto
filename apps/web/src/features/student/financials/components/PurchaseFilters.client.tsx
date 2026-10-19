'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { PurchaseHistoryFilters } from '../types'

interface PurchaseFiltersProps {
  onFilterChange: (filters: PurchaseHistoryFilters) => void
}

export function PurchaseFilters({ onFilterChange }: PurchaseFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [year, setYear] = useState('all')
  const [status, setStatus] = useState<'all' | 'completed' | 'refunded'>('all')

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    onFilterChange({ searchTerm: value, year, status })
  }

  const handleYearChange = (value: string) => {
    setYear(value)
    onFilterChange({ searchTerm, year: value, status })
  }

  const handleStatusChange = (rawValue: string) => {
    const value = rawValue as 'all' | 'completed' | 'refunded'
    setStatus(value)
    onFilterChange({ searchTerm, year, status: value })
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:gap-4 md:p-4">
      {/* Search */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Buscar por curso ou ID do pedido..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        />
        <Search className="absolute left-3 top-2.5 text-slate-600 dark:text-slate-400" size={18} />
      </div>

      {/* Year Filter */}
      <Select value={year} onValueChange={handleYearChange}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os anos</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="completed">Pagos</SelectItem>
          <SelectItem value="refunded">Reembolsados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
