'use client'

import { useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import { cn } from '@/shared/lib/utils'
import { submitApplicationAction } from '../../actions/submit-application'
import { formatPhoneMask } from '../../lib/phone-mask'
import { producerLeadSchema } from '../../lib/producer-lead-validations'

type YesNo = 'yes' | 'no'
type LeadField =
  | 'name'
  | 'email'
  | 'phone'
  | 'city'
  | 'hasInternetExperience'
  | 'hasRecordedContent'
  | 'topic'
  | 'notes'
type FormErrors = Partial<Record<LeadField, string>>

const FIELD_CLASS =
  'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500'

interface FieldProps {
  id: LeadField
  label: string
  error?: string
  wide?: boolean
  children: (props: { className: string; 'aria-invalid': boolean }) => ReactNode
}

/** Rótulo, campo e mensagem de erro do formulário de contato. */
function Field({ id, label, error, wide, children }: FieldProps) {
  return (
    <div className={cn('space-y-2', wide && 'md:col-span-2')}>
      <Label htmlFor={id} className="text-slate-800 dark:text-slate-100">
        {label}
      </Label>
      {children({
        className: cn(FIELD_CLASS, error && 'border-red-500 dark:border-red-500'),
        'aria-invalid': Boolean(error),
      })}
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
    </div>
  )
}

interface YesNoQuestionProps {
  question: string
  name: string
  value: YesNo
  yesLabel: string
  noLabel: string
  onChange: (value: YesNo) => void
}

/** Pergunta de sim ou não em cartão, com duas opções descritivas. */
function YesNoQuestion({ question, name, value, yesLabel, noLabel, onChange }: YesNoQuestionProps) {
  const optionClass =
    'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-300/80 px-3 py-2 text-sm text-slate-700 dark:border-slate-700/70 dark:text-slate-200'

  return (
    <div className="space-y-3 rounded-2xl border border-slate-300/80 bg-slate-50/80 p-4 dark:border-slate-700/70 dark:bg-slate-950/80">
      <Label className="text-slate-800 dark:text-slate-100">{question}</Label>
      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as YesNo)}
        className="grid gap-3"
      >
        <label className={optionClass}>
          <RadioGroupItem value="yes" id={`${name}-yes`} />
          <span>{yesLabel}</span>
        </label>
        <label className={optionClass}>
          <RadioGroupItem value="no" id={`${name}-no`} />
          <span>{noLabel}</span>
        </label>
      </RadioGroup>
    </div>
  )
}

/** Formulário "Deixe seu contato": valida no navegador, envia para a equipe e não cria conta. */
export function ProducerContactForm() {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [internetExperience, setInternetExperience] = useState<YesNo>('no')
  const [hasRecordedContent, setHasRecordedContent] = useState<YesNo>('no')
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  const clearFieldError = (field: LeadField) =>
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    const validation = producerLeadSchema.safeParse({
      name: String(formData.get('name') || ''),
      email: String(formData.get('email') || ''),
      phone: phoneInput,
      city: String(formData.get('city') || ''),
      hasInternetExperience: internetExperience,
      hasRecordedContent,
      topic: String(formData.get('topic') || ''),
      notes: String(formData.get('notes') || ''),
    })

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors
      setFieldErrors({
        name: errors.name?.[0],
        email: errors.email?.[0],
        phone: errors.phone?.[0],
        city: errors.city?.[0],
        hasInternetExperience: errors.hasInternetExperience?.[0],
        hasRecordedContent: errors.hasRecordedContent?.[0],
        topic: errors.topic?.[0],
        notes: errors.notes?.[0],
      })
      toast({
        title: 'Revise os campos',
        description: 'Preencha os dados obrigatórios corretamente antes de enviar.',
        variant: 'destructive',
      })
      return
    }

    setFieldErrors({})
    formData.set('email', validation.data.email)
    formData.set('phone', validation.data.phone)
    formData.set('city', validation.data.city)
    formData.set('hasInternetExperience', internetExperience)
    formData.set('hasRecordedContent', hasRecordedContent)

    startTransition(async () => {
      const result = await submitApplicationAction(formData)

      if (result?.success) {
        setSubmitted(true)
        form.reset()
        setPhoneInput('')
        setInternetExperience('no')
        setHasRecordedContent('no')
        toast({
          title: 'Contato enviado',
          description: 'Recebemos seus dados. Nosso time entra em contato em breve.',
        })
        return
      }

      toast({
        title: 'Erro ao enviar',
        description: result?.error || 'Não foi possível enviar seu contato agora.',
        variant: 'destructive',
      })
    })
  }

  return (
    <section id="cadastro-produtor" className="mt-16 lg:mt-20">
      <div className="rounded-3xl border border-slate-300/80 bg-white/90 p-6 shadow-xl shadow-slate-300/40 dark:border-slate-700/60 dark:bg-slate-900/85 dark:shadow-black/30 lg:p-10">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-300">
            Próximo passo
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
            Deixe seu contato
          </h2>
          <p className="mt-3 text-slate-700 dark:text-slate-300">
            Esse formulário não cria conta automaticamente. Ele envia seu contato para avaliação
            interna da equipe, que retorna com os próximos passos.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-5 text-emerald-900 dark:text-emerald-100">
            <p className="text-lg font-semibold">Contato enviado com sucesso.</p>
            <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-100/90">
              Recebemos seus dados e vamos falar com você para orientar a entrada do seu curso na
              plataforma.
            </p>
          </div>
        ) : null}

        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          {/* Armadilha para robôs: pessoa nenhuma enxerga nem preenche este campo. */}
          <input
            type="text"
            name="companyWebsite"
            autoComplete="off"
            tabIndex={-1}
            className="hidden"
            aria-hidden="true"
          />

          <Field id="name" label="Nome completo" error={fieldErrors.name}>
            {(props) => (
              <Input
                id="name"
                name="name"
                placeholder="Ex: João da Silva"
                required
                onChange={() => clearFieldError('name')}
                {...props}
              />
            )}
          </Field>

          <Field id="email" label="E-mail" error={fieldErrors.email}>
            {(props) => (
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="você@email.com"
                required
                onChange={() => clearFieldError('email')}
                {...props}
              />
            )}
          </Field>

          <Field id="phone" label="WhatsApp" error={fieldErrors.phone}>
            {(props) => (
              <Input
                id="phone"
                name="phone"
                placeholder="(18) 99999-9999"
                value={phoneInput}
                inputMode="numeric"
                required
                onChange={(event) => {
                  setPhoneInput(formatPhoneMask(event.target.value))
                  clearFieldError('phone')
                }}
                {...props}
              />
            )}
          </Field>

          <Field id="city" label="Cidade" error={fieldErrors.city}>
            {(props) => (
              <Input
                id="city"
                name="city"
                autoComplete="address-level2"
                placeholder="Ex: Guararapes - SP"
                required
                onChange={() => clearFieldError('city')}
                {...props}
              />
            )}
          </Field>

          <Field id="topic" label="Tema do curso (opcional)" error={fieldErrors.topic} wide>
            {(props) => (
              <Input
                id="topic"
                name="topic"
                placeholder="Ex: Marketing para clínicas"
                onChange={() => clearFieldError('topic')}
                {...props}
              />
            )}
          </Field>

          <YesNoQuestion
            question="Já teve contato com vendas na internet?"
            name="internet"
            value={internetExperience}
            yesLabel="Sim, já atuo ou atuei online"
            noLabel="Não, será minha primeira experiência"
            onChange={(value) => {
              setInternetExperience(value)
              clearFieldError('hasInternetExperience')
            }}
          />

          <YesNoQuestion
            question="Você já possui conteúdo gravado?"
            name="recorded"
            value={hasRecordedContent}
            yesLabel="Sim, já tenho conteúdo pronto"
            noLabel="Ainda não, preciso de apoio desde o início"
            onChange={(value) => {
              setHasRecordedContent(value)
              clearFieldError('hasRecordedContent')
            }}
          />

          <Field id="notes" label="Mensagem adicional (opcional)" error={fieldErrors.notes} wide>
            {(props) => (
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Se quiser, conte o objetivo do seu curso ou disponibilidade para gravar."
                onChange={() => clearFieldError('notes')}
                {...props}
              />
            )}
          </Field>

          <div className="md:col-span-2">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-brand-500 py-6 text-base font-bold text-black hover:bg-brand-400"
            >
              {isPending ? 'Enviando contato...' : 'Quero conversar com a equipe'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}
