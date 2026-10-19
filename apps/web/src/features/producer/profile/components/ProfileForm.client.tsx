'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { updateProducerProfile } from '../actions/profile-actions'
import type { ProducerProfile } from '../types'

interface ProfileFormProps {
  profile: ProducerProfile
  email: string
}

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPublicProfileEnabled, setIsPublicProfileEnabled] = useState(
    Boolean(profile.public_profile_enabled),
  )
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateProducerProfile(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao atualizar perfil' })
    }

    setIsLoading(false)
  }

  const socialLinks = profile.social_links || {}
  const expertiseAreasValue = profile.expertise_areas?.join(', ') || ''
  const suggestedSlug = profile.slug || 'seu-slug'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="previous_slug" value={profile.slug || ''} />
      <input
        type="hidden"
        name="public_profile_enabled"
        value={isPublicProfileEnabled ? 'true' : 'false'}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nome Completo</Label>
          <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">Nome de Exibição</Label>
          <Input
            id="display_name"
            name="display_name"
            defaultValue={profile.display_name || ''}
            placeholder="Como seus alunos veem seu nome"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled />
        <p className="text-sm text-muted-foreground">O email não pode ser alterado</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Label htmlFor="public_profile_enabled_switch">Perfil público do instrutor</Label>
            <p className="text-sm text-muted-foreground">
              Ative para liberar sua página pública em{' '}
              <span className="font-mono">/instrutor/{suggestedSlug}</span>.
            </p>
          </div>
          <Switch
            id="public_profile_enabled_switch"
            checked={isPublicProfileEnabled}
            onCheckedChange={setIsPublicProfileEnabled}
            aria-label="Ativar perfil público"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug público</Label>
          <Input id="slug" name="slug" defaultValue={profile.slug || ''} placeholder="seu-nome" />
          <p className="text-xs text-muted-foreground">
            URL final: <span className="font-mono">/instrutor/{suggestedSlug}</span>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cover_url">URL da Capa do Perfil (opcional)</Label>
          <Input
            id="cover_url"
            name="cover_url"
            defaultValue={profile.cover_url || ''}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biografia</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio || ''}
          placeholder="Conte sua experiência"
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expertise_areas">Especialidades (opcional)</Label>
        <Input
          id="expertise_areas"
          name="expertise_areas"
          defaultValue={expertiseAreasValue}
          placeholder="Ex.: Culinária Fit, Marmitas, Precificação"
        />
        <p className="text-xs text-muted-foreground">
          Separe por vírgula para exibir no perfil público.
        </p>
      </div>

      <div className="space-y-3">
        <Label>Links públicos (opcional)</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website_url">Site</Label>
            <Input
              id="website_url"
              name="website_url"
              defaultValue={socialLinks.website || ''}
              placeholder="https://seusite.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram_url">Instagram</Label>
            <Input
              id="instagram_url"
              name="instagram_url"
              defaultValue={socialLinks.instagram || ''}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube_url">YouTube</Label>
            <Input
              id="youtube_url"
              name="youtube_url"
              defaultValue={socialLinks.youtube || ''}
              placeholder="https://youtube.com/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn</Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              defaultValue={socialLinks.linkedin || ''}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook_url">Facebook</Label>
            <Input
              id="facebook_url"
              name="facebook_url"
              defaultValue={socialLinks.facebook || ''}
              placeholder="https://facebook.com/..."
            />
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Salvando...' : 'Salvar Alterações'}
      </Button>
    </form>
  )
}
