import { Briefcase, Camera, Code, Rocket } from 'lucide-react'

const JOURNEY_STEPS = [
  {
    icon: Briefcase,
    title: 'Candidatura',
    description: 'Você conta sua experiência e a equipe analisa o seu perfil.',
  },
  {
    icon: Camera,
    title: 'Criação do curso',
    description: 'Monte módulos, aulas em vídeo, texto e quizzes pelo assistente de 5 passos.',
  },
  {
    icon: Code,
    title: 'Revisão',
    description: 'A equipe confere o curso e publica no catálogo quando estiver tudo certo.',
  },
  {
    icon: Rocket,
    title: 'Lançamento e vendas',
    description: 'Você acompanha vendas, alunos e saques no painel de produtor.',
  },
]

/** "Como funciona": os quatro passos da candidatura até as vendas. */
export function ProducerJourney() {
  return (
    <section className="mt-16 space-y-6 lg:mt-20">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-300">
          Como funciona
        </p>
        <h2 className="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          Você entra com a expertise. A plataforma coloca o curso no ar.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {JOURNEY_STEPS.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-300/75 bg-white/80 p-5 shadow-sm shadow-slate-200/60 dark:border-slate-700/60 dark:bg-slate-900/70 dark:shadow-none"
          >
            <div className="mb-4 inline-flex rounded-xl bg-brand-500/15 p-3 text-brand-300">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {description}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
