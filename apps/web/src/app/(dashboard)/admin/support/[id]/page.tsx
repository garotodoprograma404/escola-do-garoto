import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Calendar, MessageSquare, User } from 'lucide-react'
import { ChatBox } from '@/features/chat'
import {
  getTicket,
  getTicketContext,
  getTicketMessages,
} from '@/features/admin/support/services/supportService'
import { TicketStatusControl } from '@/features/admin/support/components/TicketStatusControl.client'
import type {
  TicketCategory,
  TicketMessage,
  TicketPriority,
  TicketStatus,
} from '@/features/admin/support/types'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { formatDateTime } from '@/shared/lib/format'

export const metadata = {
  title: 'Detalhes do Ticket | Admin',
  description: 'Visualização detalhada do ticket de suporte no painel administrativo',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

const statusLabels: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  waiting_customer: 'Aguardando Cliente',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

const categoryLabels: Record<TicketCategory, string> = {
  technical: 'Técnico',
  billing: 'Financeiro',
  course: 'Curso',
  course_content: 'Conteúdo do Curso',
  account: 'Conta',
  other: 'Outro',
}

function getStatusBadgeClass(status: TicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    case 'waiting_customer':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
    case 'resolved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
    case 'closed':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

function getPriorityBadgeClass(priority: TicketPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-600 text-white dark:bg-red-700'
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
    case 'low':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

function TicketMessagesHistory({ messages }: { messages: TicketMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
        <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma mensagem registrada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {message.userName}
              </span>
              {message.isAdmin ? <Badge variant="secondary">Equipe</Badge> : null}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {formatDateTime(message.createdAt)}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {message.message}
          </p>
        </div>
      ))}
    </div>
  )
}

async function SupportTicketDetailContent({ params }: PageProps) {
  const authContext = await getAuthenticatedUserContext()

  if (!authContext) {
    redirect('/login')
  }

  if (!authContext.roles.includes('admin')) {
    redirect('/')
  }

  const { id } = await params
  const ticket = await getTicket(id)

  if (!ticket) {
    notFound()
  }

  const [messages, context] = await Promise.all([getTicketMessages(id), getTicketContext(id)])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/support">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Voltar
          </Button>
        </Link>
        <Badge variant="outline" className="font-mono">
          Ticket #{ticket.id}
        </Badge>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          {ticket.subject}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
          <Badge className={getPriorityBadgeClass(ticket.priority)}>
            {priorityLabels[ticket.priority]}
          </Badge>
          <Badge className={getStatusBadgeClass(ticket.status)}>
            {statusLabels[ticket.status]}
          </Badge>
        </div>
        <TicketStatusControl ticketId={ticket.id} currentStatus={ticket.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {ticket.description || 'Ticket sem descrição detalhada.'}
            </p>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar size={14} />
                Criado em {formatDateTime(ticket.createdAt)}
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MessageSquare size={14} />
                {ticket.messageCount} mensagens
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <User size={14} />
                Cliente: {ticket.userName}
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Responsável: {ticket.assignedToName || 'Não atribuído'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contexto do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-slate-600 dark:text-slate-400">Nome</p>
              <p className="font-medium text-slate-900 dark:text-white">{context.user.name}</p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">E-mail</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {context.user.email || 'Não disponível'}
              </p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">Cursos</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {context.user.totalCourses}
              </p>
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-400">Total em compras</p>
              <p className="font-medium text-slate-900 dark:text-white">
                {context.user.totalSpent.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="realtime" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="realtime" className="gap-2">
                <MessageSquare size={14} />
                Chat em tempo real
              </TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="realtime" className="mt-4">
              <ChatBox
                ticketId={ticket.id}
                currentUserId={authContext.userId}
                currentUserName={authContext.profile?.full_name || authContext.email || 'Admin'}
                currentUserAvatar={authContext.profile?.avatar_url}
                isStaff={true}
                isTicketClosed={ticket.status === 'closed'}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <TicketMessagesHistory messages={messages} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tickets Relacionados</CardTitle>
        </CardHeader>
        <CardContent>
          {context.relatedTickets.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nenhum ticket relacionado encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {context.relatedTickets.map((relatedTicket) => (
                <Link
                  key={relatedTicket.id}
                  href={`/admin/support/${relatedTicket.id}`}
                  className="block rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {relatedTicket.subject}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {statusLabels[relatedTicket.status]} • {formatDateTime(relatedTicket.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TicketDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-6 w-72" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-[520px]" />
      <Skeleton className="h-48" />
    </div>
  )
}

export default function AdminSupportTicketDetailPage({ params }: PageProps) {
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <Suspense fallback={<TicketDetailSkeleton />}>
        <SupportTicketDetailContent params={params} />
      </Suspense>
    </div>
  )
}
