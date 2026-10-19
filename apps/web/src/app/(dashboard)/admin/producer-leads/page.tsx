import { getProducerLeads } from '@/features/admin/producer-leads/services/producerLeadsService'
import { getProducerApplications } from '@/features/admin/producer-leads/services/producerApplicationsService'
import { ProducerLeadsManagement } from '@/features/admin/producer-leads/components/ProducerLeadsManagement.client'
import { ProducerApplicationsTable } from '@/features/admin/producer-leads/components/ProducerApplicationsTable.client'

export default async function AdminProducerLeadsPage() {
  const [leads, applications] = await Promise.all([getProducerLeads(), getProducerApplications()])

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Produtores</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Candidaturas de contas que querem criar cursos e contatos enviados pela página pública.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Candidaturas de produtor
        </h2>
        <ProducerApplicationsTable applications={applications} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Contatos recebidos</h2>
        <ProducerLeadsManagement leads={leads} />
      </section>
    </div>
  )
}
