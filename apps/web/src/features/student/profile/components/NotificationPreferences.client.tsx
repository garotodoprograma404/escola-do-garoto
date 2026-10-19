'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { updateNotificationPreferences } from '../actions/profile-actions'
import type { NotificationPreferences } from '../types'

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferences
}

export function NotificationPreferencesForm({ preferences }: NotificationPreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [prefs, setPrefs] = useState(preferences)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const result = await updateNotificationPreferences(formData)

    if (result.success) {
      setMessage({ type: 'success', text: 'Preferências atualizadas com sucesso!' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao atualizar preferências' })
    }

    setIsLoading(false)
  }

  function handleChange(key: keyof NotificationPreferences, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold sm:text-base">Notificações por Email</h3>

        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="email_course_updates">Atualizações de Cursos</Label>
            <p className="text-sm text-muted-foreground">
              Receba notificações sobre novos conteúdos nos seus cursos
            </p>
          </div>
          <input
            type="checkbox"
            id="email_course_updates"
            name="email_course_updates"
            value="true"
            checked={prefs.email_course_updates}
            onChange={(e) => handleChange('email_course_updates', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="email_new_content">Novos Conteúdos</Label>
            <p className="text-sm text-muted-foreground">
              Receba notificações sobre novos cursos disponíveis
            </p>
          </div>
          <input
            type="checkbox"
            id="email_new_content"
            name="email_new_content"
            value="true"
            checked={prefs.email_new_content}
            onChange={(e) => handleChange('email_new_content', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="email_promotions">Promoções</Label>
            <p className="text-sm text-muted-foreground">
              Receba ofertas especiais e cupons de desconto
            </p>
          </div>
          <input
            type="checkbox"
            id="email_promotions"
            name="email_promotions"
            value="true"
            checked={prefs.email_promotions}
            onChange={(e) => handleChange('email_promotions', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="email_weekly_summary">Resumo Semanal</Label>
            <p className="text-sm text-muted-foreground">
              Receba um resumo semanal do seu progresso
            </p>
          </div>
          <input
            type="checkbox"
            id="email_weekly_summary"
            name="email_weekly_summary"
            value="true"
            checked={prefs.email_weekly_summary}
            onChange={(e) => handleChange('email_weekly_summary', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold sm:text-base">Notificações Push</h3>

        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="push_course_updates">Atualizações de Cursos</Label>
            <p className="text-sm text-muted-foreground">Notificações push sobre novos conteúdos</p>
          </div>
          <input
            type="checkbox"
            id="push_course_updates"
            name="push_course_updates"
            value="true"
            checked={prefs.push_course_updates}
            onChange={(e) => handleChange('push_course_updates', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="push_new_content">Novos Conteúdos</Label>
            <p className="text-sm text-muted-foreground">Notificações push sobre novos cursos</p>
          </div>
          <input
            type="checkbox"
            id="push_new_content"
            name="push_new_content"
            value="true"
            checked={prefs.push_new_content}
            onChange={(e) => handleChange('push_new_content', e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0"
          />
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

      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? 'Salvando...' : 'Salvar Preferências'}
      </Button>
    </form>
  )
}
