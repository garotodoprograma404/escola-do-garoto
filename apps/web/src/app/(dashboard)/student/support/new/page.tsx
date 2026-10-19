import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { CreateTicketForm, getMyCoursesForSupport } from '@/features/student/support'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Novo Ticket',
  description: 'Criar novo ticket de suporte',
}

async function NewTicketContent() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Você precisa estar autenticado</p>
      </div>
    )
  }

  // Cursos em que a pessoa está matriculada (a API só devolve os dela).
  const courses = await getMyCoursesForSupport()

  return (
    <div className="mx-auto max-w-3xl space-y-5 sm:space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Link href="/student/support">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Novo Ticket de Suporte</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Descreva seu problema e nossa equipe irá ajudá-lo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Ticket</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para criar um novo ticket de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTicketForm courses={courses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dicas para um Atendimento Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
            <li>Seja claro e específico ao descrever o problema</li>
            <li>Inclua informações sobre quando o problema ocorreu</li>
            <li>Se possível, mencione os passos para reproduzir o problema</li>
            <li>Anexe capturas de tela se relevante (em breve)</li>
            <li>Escolha a prioridade adequada para seu problema</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function NewTicketSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="mt-2 h-5 w-56 sm:w-96" />
        </div>
      </div>

      <Skeleton className="h-96 w-full" />
    </div>
  )
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<NewTicketSkeleton />}>
      <NewTicketContent />
    </Suspense>
  )
}
