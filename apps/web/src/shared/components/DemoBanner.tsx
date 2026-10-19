import { DemoRoleSwitch } from '@/features/auth/components/DemoRoleSwitch.client'

/** Altura da faixa: os cabeçalhos fixos e o player descem exatamente isso (`--demo-bar`). */
const BAR_HEIGHT = '2.5rem'

/**
 * Faixa fixa do ambiente de demonstração (`DEMO_MODE=true` no servidor do front e na API): avisa que
 * os pagamentos são simulados e deixa trocar de perfil (aluno, produtor, admin) de qualquer página.
 */
export function DemoBanner() {
  if (process.env.DEMO_MODE !== 'true') return null
  return (
    <>
      <style>{`:root { --demo-bar: ${BAR_HEIGHT}; }`}</style>
      <div
        role="note"
        style={{ height: BAR_HEIGHT }}
        className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-x-4 overflow-hidden whitespace-nowrap bg-amber-100 px-3 text-xs text-amber-950 dark:bg-amber-950 dark:text-amber-100 sm:text-sm"
      >
        <span>
          <strong>Demonstração</strong>
          <span className="hidden md:inline">
            : os pagamentos são simulados e nenhum valor é cobrado.
          </span>
        </span>
        <DemoRoleSwitch />
      </div>
    </>
  )
}
