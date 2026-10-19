'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface UserPaginationProps {
  currentPage: number
  totalPages: number
  totalUsers: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function UserPagination({
  currentPage,
  totalPages,
  totalUsers,
  pageSize,
  onPageChange,
}: UserPaginationProps) {
  // Don't show pagination if there's only one page or less
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalUsers)

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Mostrando <span className="font-semibold text-slate-900 dark:text-white">{startItem}</span>{' '}
        a <span className="font-semibold text-slate-900 dark:text-white">{endItem}</span> de{' '}
        <span className="font-semibold text-slate-900 dark:text-white">{totalUsers}</span>{' '}
        usuário(s)
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="gap-1"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            const showPage =
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)

            if (!showPage) {
              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-slate-600 dark:text-slate-400">
                    ...
                  </span>
                )
              }
              return null
            }

            return (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                className="min-w-[2.5rem]"
              >
                {page}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="gap-1"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
