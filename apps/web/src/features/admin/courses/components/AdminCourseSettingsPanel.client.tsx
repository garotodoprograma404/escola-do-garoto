'use client'

import { useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import type { CourseRoleUserOption } from '../actions/get-role-users'
import type { AdminIdentity } from '../lib/courseSettings'
import type { AdminCourseEditorSettings } from '../types'

interface SettingToggleProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function SettingToggle({ id, label, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

interface AdminCourseSettingsPanelProps {
  settings: AdminCourseEditorSettings
  adminIdentity: AdminIdentity
  producers: CourseRoleUserOption[]
  isLoadingProducers: boolean
  onChange: (patch: Partial<AdminCourseEditorSettings>) => void
}

/** Configurações só do admin: responsável pelo curso, destaque, cupons, trava de preço e notas. */
export function AdminCourseSettingsPanel({
  settings,
  adminIdentity,
  producers,
  isLoadingProducers,
  onChange,
}: AdminCourseSettingsPanelProps) {
  // O produtor atual do curso pode não estar na lista (ex.: foi desativado): mantém a opção.
  const producerOptions = useMemo(() => {
    if (!settings.producerId || producers.some((producer) => producer.id === settings.producerId)) {
      return producers
    }

    return [{ id: settings.producerId, name: 'Produtor atual', email: '' }, ...producers]
  }, [producers, settings.producerId])

  return (
    <div className="mb-8 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-brand-600" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Configurações Administrativas
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ownerMode">Responsável pelo curso</Label>
          <Select
            value={settings.ownerMode}
            onValueChange={(value) =>
              onChange({
                ownerMode: value as 'self' | 'producer',
                producerId: value === 'self' ? adminIdentity.id : settings.producerId,
              })
            }
          >
            <SelectTrigger id="ownerMode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">
                Eu mesmo ({adminIdentity.name || adminIdentity.email})
              </SelectItem>
              <SelectItem value="producer">Vincular a um produtor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings.ownerMode === 'producer' && (
          <div className="space-y-2">
            <Label htmlFor="producerId">Produtor</Label>
            <Select
              value={settings.producerId || undefined}
              onValueChange={(value) => onChange({ producerId: value })}
              disabled={isLoadingProducers}
            >
              <SelectTrigger id="producerId">
                <SelectValue placeholder="Selecione o produtor" />
              </SelectTrigger>
              <SelectContent>
                {producerOptions.map((producer) => (
                  <SelectItem key={producer.id} value={producer.id}>
                    {producer.name} {producer.email ? `(${producer.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SettingToggle
          id="isFeatured"
          label="Curso em destaque"
          checked={settings.isFeatured}
          onChange={(isFeatured) => onChange({ isFeatured })}
        />
        <SettingToggle
          id="couponsEnabled"
          label="Permitir cupons"
          checked={settings.couponsEnabled}
          onChange={(couponsEnabled) => onChange({ couponsEnabled })}
        />
        <SettingToggle
          id="priceLockedByAdmin"
          label="Bloquear preço"
          checked={settings.priceLockedByAdmin}
          onChange={(priceLockedByAdmin) => onChange({ priceLockedByAdmin })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminNotes">Notas internas do admin</Label>
        <Textarea
          id="adminNotes"
          placeholder="Observações privadas sobre o curso..."
          rows={3}
          value={settings.adminNotes}
          onChange={(event) => onChange({ adminNotes: event.target.value })}
        />
      </div>
    </div>
  )
}
