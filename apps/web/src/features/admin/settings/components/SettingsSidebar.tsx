'use client'

import { Settings, Palette, DollarSign, Mail, FileText } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { SettingsSection } from '../types'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

const SECTIONS = [
  { id: 'general' as const, label: 'Geral', icon: Settings },
  { id: 'branding' as const, label: 'Marca', icon: Palette },
  { id: 'financial' as const, label: 'Financeiro', icon: DollarSign },
  { id: 'email' as const, label: 'E-mail', icon: Mail },
  { id: 'legal' as const, label: 'Legal', icon: FileText },
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">Configurações</h3>
      <nav className="space-y-1">
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const isActive = activeSection === section.id

          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isActive
                  ? 'bg-brand-500 text-black'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{section.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
