'use client'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import type { Module } from '../../../../types'
import type { ModuleFormData } from '../types'

interface ModuleFormModalProps {
  isOpen: boolean
  editing: Module | null
  form: ModuleFormData
  errors: Partial<ModuleFormData>
  onFormChange: (form: ModuleFormData) => void
  onSave: () => void
  onClose: () => void
}

/**
 * Modal para criar/editar módulo
 */
export function ModuleFormModal({
  isOpen,
  editing,
  form,
  errors,
  onFormChange,
  onSave,
  onClose,
}: ModuleFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Atualize as informações do módulo'
              : 'Adicione um novo módulo ao currículo do curso'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="module-title">
              Título <span className="text-red-500">*</span>
            </Label>
            <Input
              id="module-title"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSave()
                }
              }}
              placeholder="Ex: Introdução ao React"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="module-description">Descrição (opcional)</Label>
            <Textarea
              id="module-description"
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  onSave()
                }
              }}
              placeholder="Descreva o que será abordado neste módulo"
              rows={3}
            />
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Dica: Pressione Ctrl+Enter para salvar
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSave}>
            {editing ? 'Salvar Alterações' : 'Adicionar Módulo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
