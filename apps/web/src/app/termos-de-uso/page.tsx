import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'
import { InstitutionalPageShell } from '@/features/public/institutional/components/InstitutionalPageShell'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Regras de uso da plataforma e condições para alunos e produtores.',
}

export default async function TermsOfUsePage() {
  const [generalSettings, legalSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getPublicLegalSettings(),
  ])

  return (
    <InstitutionalPageShell
      title="Termos de Uso"
      description="Este documento estabelece as condições de acesso e uso da plataforma."
      lastUpdatedLabel="Última atualização: 11/03/2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. Identificação da plataforma
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Este ambiente é operado por <strong>{legalSettings.companyName}</strong>, inscrita no CNPJ{' '}
          <strong>{legalSettings.companyDocument}</strong>, com atendimento pelo email{' '}
          <strong>{generalSettings.supportEmail}</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          2. Conta e acesso
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          O acesso a cursos e funcionalidades depende de cadastro válido e aceite destes termos. O
          usuário é responsável por manter seus dados corretos e preservar suas credenciais de
          acesso.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          3. Regras de uso
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          É proibido compartilhar conta, distribuir conteúdo sem autorização, tentar explorar falhas
          do sistema ou violar direitos de terceiros. A plataforma pode suspender acessos em caso de
          uso indevido.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          4. Pagamentos e reembolsos
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          As condições comerciais, incluindo direito de arrependimento e regras de estorno, seguem a{' '}
          <Link className="text-primary underline" href={legalSettings.refundPolicyUrl}>
            Política de Reembolso
          </Link>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">5. Contato</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Dúvidas sobre estes termos podem ser enviadas para{' '}
          <strong>{generalSettings.supportEmail}</strong> ou pelo telefone{' '}
          <strong>{generalSettings.supportPhone}</strong>.
        </p>
      </section>
    </InstitutionalPageShell>
  )
}
