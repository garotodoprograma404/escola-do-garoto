import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BadgeCheck, Clock3, Megaphone, XCircle } from 'lucide-react'
import { AffiliateApplicationForm } from '@/features/affiliate/components/AffiliateApplicationForm.client'
import { getAffiliateApplicationLandingData } from '@/features/affiliate/services/affiliate-application-service'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

export const metadata = {
  title: 'Programa de Afiliados',
  description: 'Candidate-se ao programa de afiliados e acompanhe o status da sua entrada.',
}

function formatStatusLabel(status: 'pending' | 'under_review' | 'approved' | 'rejected') {
  switch (status) {
    case 'under_review':
      return 'Em análise pelo time'
    case 'approved':
      return 'Aprovada'
    case 'rejected':
      return 'Rejeitada'
    default:
      return 'Pendente'
  }
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default async function AffiliateApplicationHubPage() {
  const authContext = await getAuthenticatedUserContext()

  if (!authContext) {
    redirect('/login')
  }

  if (authContext.roles.includes('affiliate')) {
    redirect('/affiliate')
  }

  const landingData = await getAffiliateApplicationLandingData()
  const application = landingData.application

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Programa de Afiliados
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Indique cursos a partir do seu painel
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Esta área concentra sua candidatura e o acompanhamento do programa. Quando sua entrada for
          aprovada, o painel de afiliado será liberado para você em uma área separada.
        </p>
      </div>

      {application ? (
        <>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Status da candidatura: {formatStatusLabel(application.status)}
                </CardTitle>
                <CardDescription className="mt-2">
                  Candidatura enviada em {formatDate(application.created_at)}.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="font-medium">Canais informados</p>
                <p className="mt-1 text-muted-foreground">
                  {application.promotion_channels.length > 0
                    ? application.promotion_channels.join(', ')
                    : 'Nenhum canal informado'}
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-5">
                <p className="text-sm font-medium">Resumo da audiência</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {application.audience_summary}
                </p>
              </div>
              <div className="rounded-2xl border p-5">
                <p className="text-sm font-medium">Experiência e motivacao</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {application.experience_summary}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {application.why_affiliate}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock3 className="h-4 w-4" />
                  Acompanhamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Você acompanha aqui cada mudança da sua candidatura, desde o envio até a resposta
                  final.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="h-4 w-4" />
                  Jornada comercial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Enquanto aguarda, você pode conhecer melhor os cursos e se preparar para divulgar
                  quando o acesso for liberado.
                </p>
                <Button variant="link" className="mt-2 h-auto p-0" asChild>
                  <Link href="/catalogo">Explorar catalogo</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  {application.status === 'rejected' ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <BadgeCheck className="h-4 w-4" />
                  )}
                  Retorno do time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {application.rejection_reason ? (
                  <p className="text-sm text-muted-foreground">{application.rejection_reason}</p>
                ) : application.status === 'approved' ? (
                  <p className="text-sm text-muted-foreground">
                    Sua candidatura foi aprovada. Se o painel de afiliado ainda não aparecer,
                    atualize a sessao.
                  </p>
                ) : application.status === 'under_review' ? (
                  <p className="text-sm text-muted-foreground">
                    Seu perfil está em análise pelo time. Assim que houver uma resposta, ela
                    aparecera aqui.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sua candidatura foi recebida. Assim que entrar em análise ou tiver uma resposta,
                    esta área será atualizada.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/afiliados">
                Voltar para a landing <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/student">Ir para o dashboard</Link>
            </Button>
          </div>
        </>
      ) : (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-2xl">Quero me candidatar</CardTitle>
            <CardDescription>
              Preencha seus dados para entrar no programa e acompanhar o andamento por esta mesma
              área.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 rounded-2xl border bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 md:grid-cols-3">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">1. Perfil e canais</p>
                <p className="mt-2">
                  Conte onde você divulga e qual tipo de audiência acompanha o seu conteúdo.
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">2. Experiência</p>
                <p className="mt-2">
                  Explique como você recomenda produtos, conteúdos ou ofertas atualmente.
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">3. Acompanhamento</p>
                <p className="mt-2">
                  Depois do envio, o status da sua candidatura passa a aparecer nesta mesma área.
                </p>
              </div>
            </div>

            <AffiliateApplicationForm
              defaultName={landingData.profile?.fullName || authContext.profile?.full_name || ''}
              defaultEmail={authContext.email}
              defaultPhone={landingData.profile?.phone || ''}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
