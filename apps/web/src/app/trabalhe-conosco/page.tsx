import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'
import { InstitutionalPageShell } from '@/features/public/institutional/components/InstitutionalPageShell'

export const metadata: Metadata = {
  title: 'Trabalhe Conosco',
  description: 'Oportunidades para atuar com educação digital na plataforma.',
}

export default async function CareersPage() {
  const [generalSettings, legalSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getPublicLegalSettings(),
  ])

  return (
    <InstitutionalPageShell
      title="Trabalhe Conosco"
      description="Buscamos pessoas comprometidas com educação, produto e tecnologia."
      lastUpdatedLabel="Última atualização: 11/03/2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. Sobre a empresa
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          A <strong>{legalSettings.companyName}</strong> opera a plataforma com foco em experiência
          de ensino, tecnologia e suporte para criadores de cursos.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          2. Como se candidatar
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Envie seu currículo e portfólio para <strong>{generalSettings.supportEmail}</strong> com o
          assunto Trabalhe Conosco.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          3. Quer atuar como produtor?
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Se seu foco for publicar e vender cursos, use o fluxo de inscrição para produtores:
        </p>
        <div>
          <Link
            href="/become-producer"
            className="inline-flex items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand-400"
          >
            Quero ser produtor
          </Link>
        </div>
      </section>
    </InstitutionalPageShell>
  )
}
