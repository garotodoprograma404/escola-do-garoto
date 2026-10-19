'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import type { LegalSettings as LegalSettingsType } from '../types'

interface LegalSettingsProps {
  settings: LegalSettingsType
  onSave: (settings: LegalSettingsType) => Promise<void>
}

export function LegalSettings({ settings, onSave }: LegalSettingsProps) {
  const [formData, setFormData] = useState<LegalSettingsType>(settings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleChange = <K extends keyof LegalSettingsType>(
    field: K,
    value: LegalSettingsType[K],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações Legais</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Defina links institucionais e dados oficiais da empresa exibidos no site.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="companyName">Nome da Empresa *</Label>
            <Input
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="companyDocument">CNPJ *</Label>
            <Input
              id="companyDocument"
              name="companyDocument"
              value={formData.companyDocument}
              onChange={(e) => handleChange('companyDocument', e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="companyAddress">Endereço da Empresa *</Label>
            <Textarea
              id="companyAddress"
              name="companyAddress"
              value={formData.companyAddress}
              onChange={(e) => handleChange('companyAddress', e.target.value)}
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="termsOfServiceUrl">URL Termos de Uso *</Label>
            <Input
              id="termsOfServiceUrl"
              name="termsOfServiceUrl"
              value={formData.termsOfServiceUrl}
              onChange={(e) => handleChange('termsOfServiceUrl', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="privacyPolicyUrl">URL Política de Privacidade *</Label>
            <Input
              id="privacyPolicyUrl"
              name="privacyPolicyUrl"
              value={formData.privacyPolicyUrl}
              onChange={(e) => handleChange('privacyPolicyUrl', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="refundPolicyUrl">URL Política de Reembolso *</Label>
            <Input
              id="refundPolicyUrl"
              name="refundPolicyUrl"
              value={formData.refundPolicyUrl}
              onChange={(e) => handleChange('refundPolicyUrl', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="cookiePolicyUrl">URL Política de Cookies *</Label>
            <Input
              id="cookiePolicyUrl"
              name="cookiePolicyUrl"
              value={formData.cookiePolicyUrl}
              onChange={(e) => handleChange('cookiePolicyUrl', e.target.value)}
              required
            />
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
