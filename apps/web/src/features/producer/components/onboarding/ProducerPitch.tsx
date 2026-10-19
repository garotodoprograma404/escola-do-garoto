import Link from 'next/link'
import { ArrowRight, Camera, Check, Globe, Send, Users } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

const BENEFITS = [
  'Painel para montar módulos, aulas e quizzes',
  'Publicação na plataforma sem mensalidade',
  'Pagamentos e saques acompanhados no painel',
  'Estrutura para vender no Brasil inteiro',
]

const REASONS = [
  { icon: Camera, text: 'Aulas em vídeo, texto, arquivos e quizzes no mesmo curso.' },
  { icon: Users, text: 'Alunos, perguntas e avaliações acompanhados em um só lugar.' },
  { icon: Globe, text: 'Plataforma pronta para hospedar e vender sem mensalidade.' },
  { icon: Send, text: 'Financeiro com saldo, comissões e pedidos de saque.' },
]

/** Topo da página "Seja produtor": proposta de valor, benefícios e os dois caminhos de entrada. */
export function ProducerPitch({ platformName }: { platformName: string }) {
  return (
    <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
          {platformName}
        </p>

        <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
          Seu talento pode virar renda com um curso pronto para vender.
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-slate-700 dark:text-slate-300">
          Você cria o curso e a plataforma cuida do resto: hospedagem das aulas, venda, pagamento e
          certificados. Sem mensalidade para publicar.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {BENEFITS.map((benefit) => (
            <div
              key={benefit}
              className="flex items-start gap-2 rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-sm text-slate-800 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-brand-500 text-black hover:bg-brand-400">
            <Link href="/minha-conta/produtor">
              Quero ser produtor <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-slate-300 bg-white/70 text-slate-700 hover:bg-white hover:text-slate-900 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <a href="#cadastro-produtor">Prefiro deixar meu contato</a>
          </Button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-300/70 bg-white/85 p-6 shadow-xl shadow-slate-300/40 dark:border-slate-700/60 dark:bg-slate-900/80 dark:shadow-black/40">
        <h2 className="mb-4 text-xl font-bold text-slate-950 dark:text-white">
          Por que na {platformName}?
        </h2>
        <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          {REASONS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-brand-400" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
