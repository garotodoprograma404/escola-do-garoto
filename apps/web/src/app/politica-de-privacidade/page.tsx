import type { Metadata } from 'next'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { getPublicLegalSettings } from '@/features/admin/settings/actions/legal-actions'
import { InstitutionalPageShell } from '@/features/public/institutional/components/InstitutionalPageShell'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como tratamos dados pessoais na plataforma.',
}

export default async function PrivacyPolicyPage() {
  const [generalSettings, legalSettings] = await Promise.all([
    getPublicGeneralSettings(),
    getPublicLegalSettings(),
  ])

  return (
    <InstitutionalPageShell
      title="Política de Privacidade"
      description="Aqui explicamos quais dados coletamos, para quais finalidades e quais direitos você possui."
      lastUpdatedLabel="Última atualização: 11/03/2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. Controlador dos dados
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          O tratamento de dados pessoais é realizado por{' '}
          <strong>{legalSettings.companyName}</strong> (CNPJ{' '}
          <strong>{legalSettings.companyDocument}</strong>), com sede em{' '}
          <strong>{legalSettings.companyAddress}</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          2. Dados coletados
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Podemos coletar dados cadastrais, dados de pagamento, histórico de acessos e interações
          necessárias para ofertar cursos, processar compras, emitir comprovantes e prestar suporte.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          3. Finalidades do tratamento
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Os dados são usados para autenticação, entrega de conteúdo educacional, suporte ao
          aluno/produtor, cumprimento de obrigações legais e segurança da plataforma.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          4. Direitos do titular
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade,
          anonimização e exclusão, conforme a legislação aplicável.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          5. Contato sobre privacidade
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Para solicitações relacionadas a dados pessoais, entre em contato por{' '}
          <strong>{generalSettings.supportEmail}</strong>.
        </p>
      </section>
    </InstitutionalPageShell>
  )
}
