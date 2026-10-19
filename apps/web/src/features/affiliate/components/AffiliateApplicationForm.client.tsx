'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { useToast } from '@/shared/hooks/use-toast'
import {
  AFFILIATE_PROMOTION_CHANNEL_OPTIONS,
  type AffiliatePromotionChannel,
} from '../lib/application-schema'
import { submitAffiliateApplicationAction } from '../actions/submit-affiliate-application'

interface AffiliateApplicationFormProps {
  defaultName?: string
  defaultEmail?: string
  defaultPhone?: string
}

const CHANNEL_LABELS: Record<AffiliatePromotionChannel, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  blog: 'Blog',
  website: 'Site',
  email: 'E-mail',
  community: 'Comunidade',
}

export function AffiliateApplicationForm({
  defaultName = '',
  defaultEmail = '',
  defaultPhone = '',
}: AffiliateApplicationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [selectedChannels, setSelectedChannels] = useState<AffiliatePromotionChannel[]>([
    'instagram',
  ])

  const toggleChannel = (channel: AffiliatePromotionChannel) => {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    )
  }

  return (
    <form
      className="space-y-6"
      action={(formData) => {
        startTransition(async () => {
          selectedChannels.forEach((channel) => {
            formData.append('promotionChannels', channel)
          })

          const result = await submitAffiliateApplicationAction(formData)

          if (result?.error) {
            toast({
              title: 'Não foi possível enviar',
              description: result.error,
              variant: 'destructive',
            })
            return
          }

          toast({
            title: 'Candidatura enviada',
            description: 'Recebemos seus dados e o time vai analisar seu perfil.',
          })
          router.refresh()
        })
      }}
    >
      <input
        type="text"
        name="companyWebsite"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome completo</Label>
          <Input id="fullName" name="fullName" defaultValue={defaultName} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultEmail} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={defaultPhone} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audienceSize">Tamanho estimado da audiência</Label>
          <Input
            id="audienceSize"
            name="audienceSize"
            placeholder="Ex.: 12 mil seguidores, lista com 3 mil contatos"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagramHandle">Instagram</Label>
          <Input id="instagramHandle" name="instagramHandle" placeholder="@seuperfil" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="youtubeChannel">Canal do YouTube</Label>
          <Input id="youtubeChannel" name="youtubeChannel" placeholder="Nome ou link do canal" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Site ou página principal</Label>
        <Input id="websiteUrl" name="websiteUrl" placeholder="https://seudominio.com" />
      </div>

      <div className="space-y-3">
        <Label>Canais de divulgação</Label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AFFILIATE_PROMOTION_CHANNEL_OPTIONS.map((channel) => {
            const checked = selectedChannels.includes(channel)

            return (
              <label
                key={channel}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  checked
                    ? 'border-primary bg-primary/5 text-slate-900 dark:text-white'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => toggleChannel(channel)}
                />
                <span>{CHANNEL_LABELS[channel]}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audienceSummary">Como é sua audiência?</Label>
        <Textarea
          id="audienceSummary"
          name="audienceSummary"
          rows={4}
          placeholder="Conte quem te acompanha, que tipo de tema você aborda e qual contexto faz sentido para recomendar cursos."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="experienceSummary">Experiência com divulgação ou afiliação</Label>
        <Textarea
          id="experienceSummary"
          name="experienceSummary"
          rows={4}
          placeholder="Explique como você divulga conteúdos, produtos ou ofertas hoje."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="whyAffiliate">Por que quer entrar no programa?</Label>
        <Textarea
          id="whyAffiliate"
          name="whyAffiliate"
          rows={4}
          placeholder="Descreva por que sua audiência combina com a proposta da plataforma."
          required
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || selectedChannels.length === 0}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar candidatura
        </Button>
      </div>
    </form>
  )
}
