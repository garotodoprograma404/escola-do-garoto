import { Badge } from '@/shared/components/ui/badge'
import { CheckCircle, Clock, Ban, AlertTriangle, DollarSign } from 'lucide-react'
import type { UserStatus } from '../types'

interface UserStatusBadgeProps {
  status: UserStatus
}

const STATUS_CONFIG: Record<
  UserStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    icon: React.ReactNode
  }
> = {
  active: {
    label: 'Ativo',
    variant: 'default',
    icon: <CheckCircle size={12} />,
  },
  pending_kyc: {
    label: 'Pendente KYC',
    variant: 'secondary',
    icon: <Clock size={12} />,
  },
  suspended: {
    label: 'Desativado',
    variant: 'outline',
    icon: <AlertTriangle size={12} />,
  },
  banned: {
    label: 'Banido',
    variant: 'destructive',
    icon: <Ban size={12} />,
  },
  blocked_finance: {
    label: 'Bloqueio Financeiro',
    variant: 'destructive',
    icon: <DollarSign size={12} />,
  },
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant={config.variant} className="inline-flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  )
}
