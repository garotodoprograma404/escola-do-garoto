import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { SupportStats, TicketCard, getMyTickets, getSupportStats } from '@/features/student/support'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { Plus, Headphones } from 'lucide-react'

export const metadata = {
  title: 'Suporte',
  description: 'Central de ajuda e suporte',
}

async function SupportContent() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const [tickets, stats] = await Promise.all([
    getMyTickets(authContext.userId),
    getSupportStats(authContext.userId),
  ])

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Suporte</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Central de ajuda e suporte</p>
        </div>
        <Link href="/student/support/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </Link>
      </div>

      <SupportStats stats={stats} />

      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-xl font-semibold">Meus Tickets</h2>

        {tickets.length === 0 ? (
          <div className="rounded-lg border py-10 text-center sm:py-12">
            <Headphones className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhum ticket encontrado</h3>
            <p className="mb-4 text-muted-foreground">
              Você ainda não criou nenhum ticket de suporte
            </p>
            <Link href="/student/support/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Ticket
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SupportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-5 w-56 sm:w-96" />
        </div>
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function StudentSupportPage() {
  return (
    <Suspense fallback={<SupportSkeleton />}>
      <SupportContent />
    </Suspense>
  )
}
