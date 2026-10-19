import { ProducerContactForm } from './onboarding/ProducerContactForm.client'
import { ProducerJourney } from './onboarding/ProducerJourney'
import { ProducerPitch } from './onboarding/ProducerPitch'

interface ProducerOnboardingFlowProps {
  platformName: string
}

/** Página "Seja produtor": proposta, como funciona e o formulário de contato. */
export function ProducerOnboardingFlow({ platformName }: ProducerOnboardingFlowProps) {
  return (
    <div className="relative overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.28),transparent_45%),radial-gradient(circle_at_80%_40%,rgba(59,130,246,0.22),transparent_42%)] opacity-70 dark:bg-[radial-gradient(circle_at_top,#f59e0b_0%,transparent_45%),radial-gradient(circle_at_80%_40%,rgba(56,189,248,0.25),transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(248,250,252,0.96),rgba(248,250,252,0.86)_50%,rgba(241,245,249,0.95))] dark:bg-[linear-gradient(115deg,rgba(15,23,42,0.95),rgba(15,23,42,0.8)_50%,rgba(15,23,42,0.95))]" />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-14 lg:pb-24 lg:pt-20">
        <ProducerPitch platformName={platformName} />
        <ProducerJourney />
        <ProducerContactForm />
      </div>
    </div>
  )
}
