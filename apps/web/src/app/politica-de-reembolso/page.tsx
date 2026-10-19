import type { Metadata } from 'next'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'
import { InstitutionalPageShell } from '@/features/public/institutional/components/InstitutionalPageShell'

export const metadata: Metadata = {
  title: 'Política de Reembolso',
  description: 'Regras de reembolso, arrependimento e atendimento ao consumidor.',
}

export default async function RefundPolicyPage() {
  const [generalSettings, legalSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getPublicLegalSettings(),
  ])

  return (
    <InstitutionalPageShell
      title="Política de Reembolso"
      description="Esta política define como funcionam solicitações de cancelamento e estorno."
      lastUpdatedLabel="Última atualização: 11/03/2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. Direito de arrependimento
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Compras feitas online podem ser canceladas em até 7 dias corridos a partir da contratação,
          conforme legislação brasileira aplicável ao comércio eletrônico.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          2. Como solicitar
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          O pedido deve ser feito pela área do aluno, na central de suporte, ou via e-mail{' '}
          <strong>{generalSettings.supportEmail}</strong>, informando o curso e o motivo da
          solicitação.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          3. Prazo de análise e estorno
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          A equipe analisa a solicitação em até 5 dias úteis. Quando aprovado, o estorno segue o
          prazo e regras do meio de pagamento utilizado.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          4. Contato oficial
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Esta política é mantida por <strong>{legalSettings.companyName}</strong> (CNPJ{' '}
          <strong>{legalSettings.companyDocument}</strong>).
        </p>
      </section>
    </InstitutionalPageShell>
  )
}
