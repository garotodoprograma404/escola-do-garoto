'use client'

import { useState } from 'react'
import {
  StudentFinancialSummary,
  PurchaseHistory,
  PurchaseFilters,
  generateInvoiceAction,
} from '@/features/student/financials'
import type {
  StudentTransaction,
  FinancialStatsType,
  PurchaseHistoryFilters,
} from '@/features/student/financials'
import { useToast } from '@/shared/hooks/use-toast'

interface StudentFinancialsContentProps {
  transactions: StudentTransaction[]
  stats: FinancialStatsType
}

export function StudentFinancialsContent({ transactions, stats }: StudentFinancialsContentProps) {
  const [filteredTransactions, setFilteredTransactions] = useState(transactions)
  const { toast } = useToast()

  const handleFilterChange = (filters: PurchaseHistoryFilters) => {
    let filtered = [...transactions]

    // Filtro de busca
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.course_title.toLowerCase().includes(term) ||
          t.id.toLowerCase().includes(term) ||
          t.producer_name.toLowerCase().includes(term),
      )
    }

    // Filtro de ano
    if (filters.year && filters.year !== 'all') {
      filtered = filtered.filter((t) => {
        const year = new Date(t.created_at).getFullYear().toString()
        return year === filters.year
      })
    }

    // Filtro de status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((t) => t.status === filters.status)
    }

    setFilteredTransactions(filtered)
  }

  const handleDownloadInvoice = async (transactionId: string) => {
    try {
      const result = await generateInvoiceAction(transactionId)

      if (result.success && result.pdfUrl) {
        // Download do comprovante (o link é da própria API, com o cookie de sessão)
        const link = document.createElement('a')
        link.href = result.pdfUrl
        link.download = result.filename || `comprovante-${transactionId}.html`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast({
          title: 'Comprovante baixado',
          description: 'O download foi iniciado',
        })
      } else {
        toast({
          title: 'Comprovante indisponível',
          description: result.message || 'Não foi possível gerar o comprovante desta compra',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o comprovante',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-5 sm:space-y-8">
      <StudentFinancialSummary stats={stats} />

      <PurchaseFilters onFilterChange={handleFilterChange} />

      <PurchaseHistory
        transactions={filteredTransactions}
        onDownloadInvoice={handleDownloadInvoice}
      />
    </div>
  )
}
