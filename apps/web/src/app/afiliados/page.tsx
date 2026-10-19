import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  CheckCircle2,
  Clock3,
  Link2,
  PanelTop,
} from 'lucide-react'
import { PublicLayout } from '@/shared/components/PublicLayout'
import { Button } from '@/shared/components/ui/button'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'

const steps = [
  {
    title: 'Cadastre-se na plataforma',
    description: 'Crie sua conta para acessar a plataforma e entrar no seu painel pessoal.',
    icon: CheckCircle2,
  },
  {
    title: 'Acesse a jornada no seu painel',
    description:
      'A candidatura acontece dentro da sua área autenticada, em um fluxo separado da landing pública.',
    icon: PanelTop,
  },
  {
    title: 'Receba acesso ao painel',
    description:
      'Depois da aprovação, você acompanha links, campanhas, conversões e comissões no dashboard.',
    icon: BarChart3,
  },
]

const benefits = [
  {
    title: 'Links rastreáveis por campanha',
    description:
      'Organize divulgações por curso e acompanhe o desempenho de cada link com atribuição dedicada.',
    icon: Link2,
  },
  {
    title: 'Comissão registrada no financeiro',
    description:
      'As vendas comissionadas entram no ledger do afiliado e seguem a regra de liberação vigente.',
    icon: BadgePercent,
  },
  {
    title: 'Janela comercial de 30 dias',
    description:
      'Atribuição por último clique com janela de cookie pensada para campanhas e conteúdo recorrente.',
    icon: Clock3,
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const generalSettings = await getPublicGeneralSettings()

  return {
    title: `Programa de Afiliados | ${generalSettings.platformName}`,
    description:
      'Conheça o programa de afiliados da plataforma e descubra como indicar cursos com links rastreáveis, campanhas e acompanhamento financeiro.',
  }
}

export default async function AffiliateProgramPage() {
  const authContext = await getAuthenticatedUserContext()
  const hasAffiliateAccess = authContext?.roles.includes('affiliate') ?? false

  return (
    <PublicLayout>
      <div className="bg-[linear-gradient(180deg,_#fff_0%,_#fffaf0_16%,_#f8fafc_42%,_#fff_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,_#020617_0%,_#0f172a_38%,_#020617_100%)] dark:text-white">
        <section className="overflow-hidden border-b border-slate-200/80 dark:border-slate-800">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
            <div>
              <span className="inline-flex rounded-full border border-amber-300/80 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
                Programa de Afiliados
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Indique cursos, acompanhe campanhas e monetize sua audiência com mais clareza.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Criamos uma operação de afiliados pensada para creators, parceiros comerciais e
                comunidades que já recomendam educação online. O fluxo de entrada acontece no painel
                do usuário, sem misturar descoberta com candidatura.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                {!authContext ? (
                  <>
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/register">
                        Quero participar <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/login">Já tenho conta</Link>
                    </Button>
                  </>
                ) : hasAffiliateAccess ? (
                  <>
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/affiliate">
                        Acessar dashboard <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/affiliate/profile">Ver perfil do afiliado</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="lg" className="gap-2">
                      <Link href="/minha-conta/afiliado">
                        Quero me tornar afiliado <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/catalog">Explorar cursos</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-200/70 bg-slate-950 p-8 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.55)] dark:border-amber-400/20">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
                O que você encontra
              </p>
              <div className="mt-8 space-y-5">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon

                  return (
                    <div
                      key={benefit.title}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl bg-amber-300/10 p-3 text-amber-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold">{benefit.title}</h2>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Como funciona nesta fase
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                O programa já conta com dashboard, links, rastreio e financeiro. A página pública
                apresenta a proposta, e a jornada autenticada continua dentro do painel do usuário.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon

                return (
                  <article
                    key={step.title}
                    className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-400">
                        Etapa {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {authContext && hasAffiliateAccess ? (
          <section className="pb-20">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-10">
                <h2 className="text-3xl font-bold tracking-tight">
                  Seu acesso de afiliado já está liberado
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Sua conta já tem acesso de afiliado. Agora você pode criar links, acompanhar
                  conversoes e operar seu financeiro pelo dashboard.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/affiliate">
                      Ir para o dashboard <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/catalog">Ver catalogo</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : authContext ? (
          <section className="pb-20">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-10">
                <h2 className="text-3xl font-bold tracking-tight">
                  Continue a jornada no seu painel
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  A candidatura e o acompanhamento do seu acesso ficam dentro da área autenticada,
                  em um fluxo separado da landing publica.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/minha-conta/afiliado">
                      Abrir meu painel <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/student">Ir para dashboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {!authContext ? (
          <section className="pb-20">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-10">
                <h2 className="text-3xl font-bold tracking-tight">
                  Pronto para entrar na fila de aprovação?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Crie sua conta agora para acessar seu painel e continuar a jornada de afiliado na
                  área autenticada da plataforma.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/register">
                      Criar conta <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/catalog">Explorar cursos da plataforma</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </PublicLayout>
  )
}
