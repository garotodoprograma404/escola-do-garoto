import { Badge } from '@/shared/components/ui/badge'
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Archive } from 'lucide-react'
import type { CourseStatus } from '../types'

interface CourseStatusBadgeProps {
  status: CourseStatus
}

const STATUS_CONFIG: Record<
  CourseStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
    className?: string
  }
> = {
  draft: {
    label: 'Rascunho',
    variant: 'secondary',
    icon: <FileText size={12} />,
  },
  pending: {
    label: 'Pendente',
    variant: 'outline',
    icon: <Clock size={12} />,
    className: 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
  },
  pending_review: {
    label: 'Em Análise',
    variant: 'outline',
    icon: <Clock size={12} />,
    className: 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
  },
  approved: {
    label: 'Aprovado',
    variant: 'default',
    icon: <CheckCircle size={12} />,
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900',
  },
  rejected: {
    label: 'Rejeitado',
    variant: 'destructive',
    icon: <XCircle size={12} />,
  },
  changes_requested: {
    label: 'Mudanças Solicitadas',
    variant: 'outline',
    icon: <AlertCircle size={12} />,
    className: 'border-orange-500 text-orange-700 dark:text-orange-400',
  },
  archived: {
    label: 'Arquivado',
    variant: 'secondary',
    icon: <Archive size={12} />,
  },
}

export function CourseStatusBadge({ status }: CourseStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge
      variant={config.variant}
      className={`inline-flex items-center gap-1 ${config.className || ''}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  )
}
