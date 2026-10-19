'use client'

import { MessageSquare, Clock, User, Tag } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { Ticket, TicketStatus, TicketPriority } from '../types'

interface TicketListTableProps {
  tickets: Ticket[]
  onView: (ticket: Ticket) => void
}

function getStatusBadge(status: TicketStatus): React.ReactNode {
  switch (status) {
    case 'open':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Aberto
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Em Andamento
        </Badge>
      )
    case 'waiting_customer':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Aguardando Cliente
        </Badge>
      )
    case 'resolved':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Resolvido
        </Badge>
      )
    case 'closed':
      return (
        <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
          Fechado
        </Badge>
      )
  }
}

function getPriorityBadge(priority: TicketPriority): React.ReactNode {
  switch (priority) {
    case 'urgent':
      return <Badge className="bg-red-600 text-white">Urgente</Badge>
    case 'high':
      return (
        <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          Alta
        </Badge>
      )
    case 'medium':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Média
        </Badge>
      )
    case 'low':
      return (
        <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
          Baixa
        </Badge>
      )
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

export function TicketListTable({ tickets, onView }: TicketListTableProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">Nenhum ticket encontrado.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atribuído</TableHead>
            <TableHead>Última Atualização</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              {/* Ticket Info */}
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                      #{ticket.id}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white">{ticket.subject}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag size={10} className="mr-1" />
                        {tag}
                      </Badge>
                    ))}
                    {ticket.courseName && (
                      <Badge variant="outline" className="text-xs">
                        {ticket.courseName}
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Customer */}
              <TableCell>
                <div className="flex items-center gap-2">
                  {ticket.userAvatar ? (
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                      {ticket.userName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {ticket.userName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{ticket.userEmail}</p>
                  </div>
                </div>
              </TableCell>

              {/* Priority */}
              <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>

              {/* Status */}
              <TableCell>{getStatusBadge(ticket.status)}</TableCell>

              {/* Assigned */}
              <TableCell>
                {ticket.assignedToName ? (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-slate-600 dark:text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {ticket.assignedToName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-slate-600 dark:text-slate-400">Não atribuído</span>
                )}
              </TableCell>

              {/* Last Update */}
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock size={14} />
                    {formatDate(ticket.lastMessageAt)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <MessageSquare size={12} />
                    {ticket.messageCount} mensagens
                  </div>
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(ticket)}
                  className="text-brand-500 hover:text-brand-600"
                >
                  Ver Detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
