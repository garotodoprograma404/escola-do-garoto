'use client'

import { Search } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { UserFilters as UserFiltersType } from '../types'

interface UserFiltersProps {
  filters: UserFiltersType
  onChange: (key: keyof UserFiltersType, value: string) => void
}

export function UserFilters({ filters, onChange }: UserFiltersProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
            size={18}
          />
          <Input
            type="text"
            placeholder="Buscar por nome, email ou CPF..."
            value={filters.searchTerm}
            onChange={(e) => onChange('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Role Filter */}
        <Select value={filters.role} onValueChange={(value) => onChange('role', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os papéis</SelectItem>
            <SelectItem value="student">Aluno</SelectItem>
            <SelectItem value="producer">Produtor</SelectItem>
            <SelectItem value="affiliate">Afiliado</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => onChange('status', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="pending_kyc">Pendente KYC</SelectItem>
            <SelectItem value="suspended">Desativado</SelectItem>
            <SelectItem value="banned">Banido</SelectItem>
            <SelectItem value="blocked_finance">Bloqueio Financeiro</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
