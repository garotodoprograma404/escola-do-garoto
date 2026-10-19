// =====================================================
// CTA SECTION - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export function CTASection() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-16 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Content */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Torne-se um Produtor de Sucesso
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Compartilhe seu conhecimento e crie uma nova fonte de renda. Nossa plataforma oferece
              todas as ferramentas que você precisa.
            </p>

            {/* Benefits */}
            <ul className="mt-8 space-y-4">
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-slate-700 dark:text-slate-200">
                  Hospedagem de vídeo ilimitada
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-slate-700 dark:text-slate-200">
                  Pagamentos seguros e automáticos
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-slate-700 dark:text-slate-200">
                  Ferramentas de marketing integradas
                </span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-slate-700 dark:text-slate-200">
                  Suporte dedicado para produtores
                </span>
              </li>
            </ul>

            {/* CTA */}
            <div className="mt-8">
              <Button asChild size="lg" className="gap-2">
                <Link href="/become-producer">
                  Começar a Ensinar <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-3xl">
              <Image
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80"
                alt="Produtor de cursos"
                width={800}
                height={800}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="h-full w-full object-cover opacity-95 dark:opacity-80"
              />
            </div>
            {/* Accent Box */}
            <div className="absolute -bottom-4 -right-4 -z-10 h-24 w-24 rounded-xl bg-primary/25 dark:bg-primary" />
          </div>
        </div>
      </div>
    </section>
  )
}
