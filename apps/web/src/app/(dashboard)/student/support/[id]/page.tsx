import { Suspense } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import {
  TicketMessages,
  SendMessageForm,
  CloseTicketButton,
  getTicket,
  getTicketMessages,
} from '@/features/student/support'
import { ChatBox } from '@/features/chat'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { ArrowLeft, Calendar, User, MessageSquare, History } from 'lucide-react'
import {
  canStudentCloseTicket,
  normalizeSupportTicketStatus,
  STUDENT_SUPPORT_STATUS_COLORS,
  STUDENT_SUPPORT_STATUS_LABELS,
} from '@/features/student/support/lib/ticket-status'

export const metadata = {
  title: 'Ticket de Suporte',
  description: 'Detalhes do ticket de suporte',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
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

async function TicketContent({ params }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const { id } = await params
  const [ticket, messages] = await Promise.all([
    getTicket(id, authContext.userId),
    getTicketMessages(id, authContext.userId),
  ])

  if (!ticket) {
    notFound()
  }

  const normalizedStatus = normalizeSupportTicketStatus(ticket.status)
  const isTicketClosed = normalizedStatus === 'closed'
  const canClose = canStudentCloseTicket(normalizedStatus)
  const isStaff = authContext.roles.includes('admin')

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link href="/student/support">
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{ticket.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{categoryLabels[ticket.category]}</Badge>
            <Badge className={priorityColors[ticket.priority]}>
              {priorityLabels[ticket.priority]}
            </Badge>
            <Badge className={STUDENT_SUPPORT_STATUS_COLORS[normalizedStatus]}>
              {STUDENT_SUPPORT_STATUS_LABELS[normalizedStatus]}
            </Badge>
          </div>
        </div>
        {canClose && <CloseTicketButton ticketId={ticket.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">Descrição</h3>
            <p className="whitespace-pre-wrap text-muted-foreground">{ticket.description}</p>
          </div>

          {ticket.course_title && (
            <div>
              <h3 className="mb-2 font-semibold">Curso Relacionado</h3>
              <p className="text-muted-foreground">{ticket.course_title}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 border-t pt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                Criado em{' '}
                {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversação</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="realtime" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1">
              <TabsTrigger
                value="realtime"
                className="gap-1 px-2 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
              >
                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Chat em Tempo Real</span>
                <span className="sm:hidden">Chat</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="gap-1 px-2 py-2 text-xs sm:gap-2 sm:px-3 sm:text-sm"
              >
                <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="realtime" className="mt-4">
              <ChatBox
                ticketId={ticket.id}
                currentUserId={authContext.userId}
                currentUserName={authContext.profile?.full_name || 'Usuário'}
                currentUserAvatar={authContext.profile?.avatar_url}
                isStaff={isStaff}
                isTicketClosed={isTicketClosed}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4 space-y-6">
              <TicketMessages messages={messages} />
              <div className="border-t pt-4">
                <SendMessageForm ticketId={ticket.id} isTicketClosed={isTicketClosed} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function TicketSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1">
          <Skeleton className="h-9 w-full max-w-[24rem]" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>

      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function TicketDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<TicketSkeleton />}>
      <TicketContent params={params} />
    </Suspense>
  )
}
