'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import type { FinancialSettings as FinancialSettingsType } from '../types'

interface FinancialSettingsProps {
  settings: FinancialSettingsType
  onSave: (settings: FinancialSettingsType) => Promise<void>
}

export function FinancialSettings({ settings, onSave }: FinancialSettingsProps) {
  const [formData, setFormData] = useState<FinancialSettingsType>(settings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleBooleanChange = (
    field: 'pixEnabled' | 'creditCardEnabled' | 'boletoEnabled',
    value: boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleNumberChange = (field: 'maxInstallments' | 'defaultInstallments', value: string) => {
    const numeric = Number.parseInt(value, 10)

    setFormData((prev) => ({
      ...prev,
      [field]: Number.isFinite(numeric) ? numeric : 1,
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Configurações Financeiras
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Controle os métodos e regras de pagamento do Checkout Pro.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">Métodos de pagamento</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Conta Mercado Pago pode continuar visível por regra do provedor.
          </p>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">PIX</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Permite pagamento instantâneo via PIX.
                </p>
              </div>
              <Switch
                checked={formData.pixEnabled}
                onCheckedChange={(checked) => handleBooleanChange('pixEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Cartão (crédito/débito)
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Permite pagamento com cartão no checkout.
                </p>
              </div>
              <Switch
                checked={formData.creditCardEnabled}
                onCheckedChange={(checked) => handleBooleanChange('creditCardEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Boleto</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Permite pagamento por boleto bancário.
                </p>
              </div>
              <Switch
                checked={formData.boletoEnabled}
                onCheckedChange={(checked) => handleBooleanChange('boletoEnabled', checked)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="maxInstallments">Máximo de parcelas</Label>
            <Input
              id="maxInstallments"
              type="number"
              min={1}
              max={24}
              value={formData.maxInstallments}
              onChange={(e) => handleNumberChange('maxInstallments', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="defaultInstallments">Parcela padrão</Label>
            <Input
              id="defaultInstallments"
              type="number"
              min={1}
              max={24}
              value={formData.defaultInstallments}
              onChange={(e) => handleNumberChange('defaultInstallments', e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Recomendado para seu cenário: PIX e cartão ativos, boleto desativado.
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
