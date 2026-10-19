import { redirect } from 'next/navigation'
import { ProducerApplicationForm } from '@/features/producer/components/ProducerApplicationForm.client'
import {
  getOwnProducerApplication,
  type ProducerApplicationStatus,
} from '@/features/producer/services/producerApplicationService'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

export const metadata = {
  title: 'Ser produtor',
  description: 'Candidate-se para criar e vender cursos na plataforma.',
}

const STATUS_LABELS: Record<ProducerApplicationStatus, string> = {
  pending: 'Recebida',
  under_review: 'Em análise',
  approved: 'Aprovada',
  rejected: 'Recusada',
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  )
}

export default async function ProducerApplicationPage() {
  const authContext = await getAuthenticatedUserContext()

  if (!authContext) {
    redirect('/login')
  }

  if (authContext.roles.includes('producer')) {
    redirect('/producer')
  }

  const application = await getOwnProducerApplication()
  const canApply = !application || application.status === 'rejected'

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Programa de produtores
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crie e venda seus cursos</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Envie sua candidatura. Quando a equipe aprovar, o painel de produtor é liberado na sua
          conta e você já pode montar seu primeiro curso.
        </p>
      </div>

      {application ? (
        <Card>
          <CardHeader>
            <CardTitle>Status da candidatura: {STATUS_LABELS[application.status]}</CardTitle>
            <CardDescription>Enviada em {formatDate(application.createdAt)}.</CardDescription>
          </CardHeader>
          {application.status === 'rejected' && application.rejectionReason ? (
            <CardContent>
              <p className="text-sm font-medium">Motivo da recusa</p>
              <p className="mt-1 text-sm text-muted-foreground">{application.rejectionReason}</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Você pode corrigir os dados e enviar uma nova candidatura abaixo.
              </p>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {canApply ? (
        <Card>
          <CardHeader>
            <CardTitle>Candidatura de produtor</CardTitle>
            <CardDescription>
              Usamos estes dados só para analisar sua entrada e montar seu perfil de instrutor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProducerApplicationForm defaultName={authContext.profile?.full_name ?? ''} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
