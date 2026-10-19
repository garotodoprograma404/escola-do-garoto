'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { GeneralSettings as GeneralSettingsType } from '../types'

interface GeneralSettingsProps {
  settings: GeneralSettingsType
  onSave: (settings: GeneralSettingsType) => Promise<void>
}

export function GeneralSettings({ settings, onSave }: GeneralSettingsProps) {
  const [formData, setFormData] = useState<GeneralSettingsType>(settings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleChange = <K extends keyof GeneralSettingsType>(
    field: K,
    value: GeneralSettingsType[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações Gerais</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Configure as informações básicas da plataforma
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="platformName">Nome da Plataforma *</Label>
            <Input
              id="platformName"
              name="platformName"
              value={formData.platformName}
              onChange={(e) => handleChange('platformName', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="supportEmail">Email de Suporte *</Label>
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              value={formData.supportEmail}
              onChange={(e) => handleChange('supportEmail', e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="platformDescription">Descrição</Label>
            <Textarea
              id="platformDescription"
              name="platformDescription"
              value={formData.platformDescription}
              onChange={(e) => handleChange('platformDescription', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="supportPhone">Telefone de Suporte</Label>
            <Input
              id="supportPhone"
              name="supportPhone"
              value={formData.supportPhone}
              onChange={(e) => handleChange('supportPhone', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Select
              name="timezone"
              value={formData.timezone}
              onValueChange={(value) => handleChange('timezone', value)}
            >
              <SelectTrigger aria-label="Fuso horário">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="language">Idioma</Label>
            <Select
              name="language"
              value={formData.language}
              onValueChange={(value) => handleChange('language', value)}
            >
              <SelectTrigger aria-label="Idioma">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="currency">Moeda</Label>
            <Select
              name="currency"
              value={formData.currency}
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger aria-label="Moeda">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real (BRL)</SelectItem>
                <SelectItem value="USD">Dólar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="maintenanceMode">Modo Manutenção</Label>
            <Select
              name="maintenanceMode"
              value={formData.maintenanceMode ? 'true' : 'false'}
              onValueChange={(value) => handleChange('maintenanceMode', value === 'true')}
            >
              <SelectTrigger aria-label="Modo de manutenção">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Desativado</SelectItem>
                <SelectItem value="true">Ativado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-brand-500 text-black hover:bg-brand-400"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
