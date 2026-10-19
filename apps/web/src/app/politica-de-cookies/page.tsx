import type { Metadata } from 'next'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { InstitutionalPageShell } from '@/features/public/institutional/components/InstitutionalPageShell'

export const metadata: Metadata = {
  title: 'Política de Cookies',
  description: 'Informações sobre uso de cookies e tecnologias similares.',
}

export default async function CookiePolicyPage() {
  const generalSettings = await getPublicGeneralSettings()

  return (
    <InstitutionalPageShell
      title="Política de Cookies"
      description="Explicamos como utilizamos cookies para segurança, desempenho e experiência de navegação."
      lastUpdatedLabel="Última atualização: 11/03/2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. O que são cookies
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Cookies são pequenos arquivos gravados no navegador para reconhecer sessões e
          preferências.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">2. Como usamos</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Usamos cookies para autenticação, segurança, análise de desempenho e continuidade da
          experiência no site.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">3. Contato</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Para dúvidas sobre cookies e privacidade, entre em contato por{' '}
          <strong>{generalSettings.supportEmail}</strong>.
        </p>
      </section>
    </InstitutionalPageShell>
  )
}
