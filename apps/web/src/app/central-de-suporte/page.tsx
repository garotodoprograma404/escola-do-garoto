import type { Metadata } from 'next'
import Link from 'next/link'
import { getPublicGeneralSettings } from '@/features/admin/settings/actions/general-actions'
import { InstitutionalPageShell } from '@/features/public/institutional/components/InstitutionalPageShell'

export const metadata: Metadata = {
  title: 'Central de Suporte',
  description: 'Canais oficiais de atendimento para alunos e produtores.',
}

export default async function SupportCenterPage() {
  const generalSettings = await getPublicGeneralSettings()

  return (
    <InstitutionalPageShell
      title="Central de Suporte"
      description="Atendimento para dúvidas técnicas, pagamentos, acesso a cursos e solicitações gerais."
      lastUpdatedLabel="Última atualização: 11/03/2026"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          1. Canais de atendimento
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          E-mail: <strong>{generalSettings.supportEmail}</strong>
          <br />
          Telefone: <strong>{generalSettings.supportPhone}</strong>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          2. Atendimento logado
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Se você já possui conta, abra um ticket para acompanhamento detalhado:
        </p>
        <div>
          <Link
            href="/student/support"
            className="inline-flex items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-brand-400"
          >
            Ir para central do aluno
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          3. Horário de resposta
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Resposta inicial em até 1 dia útil para chamados abertos pelos canais oficiais.
        </p>
      </section>
    </InstitutionalPageShell>
  )
}
