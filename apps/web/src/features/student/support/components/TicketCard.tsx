import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Calendar, User } from 'lucide-react'
import type { SupportTicket } from '../types'
import {
  normalizeSupportTicketStatus,
  STUDENT_SUPPORT_STATUS_COLORS,
  STUDENT_SUPPORT_STATUS_LABELS,
} from '../lib/ticket-status'

interface TicketCardProps {
  ticket: SupportTicket
}

const categoryLabels = {
  technical: 'Técnico',
  billing: 'Financeiro',
  course: 'Curso',
  course_content: 'Conteúdo do Curso',
  account: 'Conta',
  other: 'Outro',
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

export function TicketCard({ ticket }: TicketCardProps) {
  const normalizedStatus = normalizeSupportTicketStatus(ticket.status)

  return (
    <Link href={`/student/support/${ticket.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="mb-2 text-base font-semibold sm:text-lg">{ticket.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
              <Badge className={priorityColors[ticket.priority]}>
                {priorityLabels[ticket.priority]}
              </Badge>
              <Badge className={STUDENT_SUPPORT_STATUS_COLORS[normalizedStatus]}>
                {STUDENT_SUPPORT_STATUS_LABELS[normalizedStatus]}
              </Badge>
            </div>

            {ticket.course_title && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Curso:</span> {ticket.course_title}
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t pt-2 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {ticket.assigned_to_name && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Atribuído a: {ticket.assigned_to_name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
