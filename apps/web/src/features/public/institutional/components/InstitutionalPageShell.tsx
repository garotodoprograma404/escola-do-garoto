import { PublicLayout } from '@/shared/components/PublicLayout'

interface InstitutionalPageShellProps {
  title: string
  description: string
  lastUpdatedLabel: string
  children: React.ReactNode
}

export function InstitutionalPageShell({
  title,
  description,
  lastUpdatedLabel,
  children,
}: InstitutionalPageShellProps) {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{description}</p>
            <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">{lastUpdatedLabel}</p>
          </header>

          <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {children}
          </article>
        </section>
      </div>
    </PublicLayout>
  )
}
