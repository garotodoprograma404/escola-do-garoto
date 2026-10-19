import Link from 'next/link'
import { ArrowRight, BadgePercent, Clock3, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

const PROGRAM_HIGHLIGHTS = [
  {
    icon: BadgePercent,
    title: 'Comissão por venda aprovada',
    description: 'Indique cursos da plataforma e acompanhe suas comissões em um painel próprio.',
  },
  {
    icon: Clock3,
    title: 'Janela comercial de 30 dias',
    description:
      'Seu link continua atribuindo vendas por até 30 dias dentro da regra vigente do programa.',
  },
  {
    icon: ShieldCheck,
    title: 'Entrada com aprovação manual',
    description:
      'Analisamos cada perfil antes de liberar o acesso operacional ao dashboard de afiliado.',
  },
]

export function AffiliateProgramSection() {
  return (
    <section className="bg-white py-16 text-slate-900 dark:bg-slate-950 dark:text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_35%),linear-gradient(135deg,_#fffaf0_0%,_#ffffff_55%,_#f8fafc_100%)] shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] dark:border-amber-400/20 dark:bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.96)_0%,_rgba(2,6,23,1)_100%)]">
          <div className="grid gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-14 lg:py-14">
            <div>
              <span className="inline-flex rounded-full border border-amber-300/80 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
                Programa de Afiliados
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
                Transforme sua audiência em receita com links rastreáveis e comissão por venda.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Se você produz conteúdo, tem comunidade ou recomenda cursos com frequência, nosso
                programa de afiliados foi desenhado para dar visibilidade, rastreio e
                previsibilidade financeira.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/afiliados">
                    Conhecer o programa <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">Criar conta e acompanhar novidades</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {PROGRAM_HIGHLIGHTS.map((item) => {
                const Icon = item.icon

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/70 bg-white/85 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-slate-950 p-3 text-amber-300 dark:bg-amber-300/10 dark:text-amber-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
