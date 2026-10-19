import { useState, useEffect } from 'react'
import type { Module } from '../../../../types'
import type { ModuleFormData } from '../types'
import { INITIAL_MODULE_FORM } from '../constants'
import { useValidation } from './useValidation'
import { useStableCallback } from '@/shared/hooks/useStableCallback'

interface UseModulesProps {
  initialModules: Module[]
  onUpdate: (modules: Module[]) => void
}

/**
 * Hook para gerenciar CRUD de módulos
 */
export function useModules({ initialModules, onUpdate }: UseModulesProps) {
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [moduleForm, setModuleForm] = useState<ModuleFormData>(INITIAL_MODULE_FORM)
  const [moduleFormErrors, setModuleFormErrors] = useState<Partial<ModuleFormData>>({})
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null)

  const { validateModuleForm } = useValidation()
  const updateParent = useStableCallback(onUpdate)

  // Sincronizar com componente pai
  useEffect(() => {
    updateParent(modules)
  }, [modules, updateParent])

  /**
   * Abrir modal para criar módulo
   */
  const openCreateDialog = (): void => {
    setEditingModule(null)
    setModuleForm(INITIAL_MODULE_FORM)
    setModuleFormErrors({})
    setIsModalOpen(true)
  }

  /**
   * Abrir modal para editar módulo
   */
  const openEditDialog = (module: Module): void => {
    setEditingModule(module)
    setModuleForm({
      title: module.title,
      description: module.description || '',
    })
    setModuleFormErrors({})
    setIsModalOpen(true)
  }

  /**
   * Salvar módulo (criar ou editar)
   */
  const handleSave = (): void => {
    const errors = validateModuleForm(moduleForm)
    setModuleFormErrors(errors)

    if (Object.keys(errors).length > 0) return

    if (editingModule) {
      // Editar
      setModules(
        modules.map((m) =>
          m.id === editingModule.id
            ? {
                ...m,
                title: moduleForm.title.trim(),
                description: moduleForm.description.trim() || undefined,
              }
            : m,
        ),
      )
    } else {
      // Criar
      const newModule: Module = {
        id: `module-${crypto.randomUUID()}`,
        title: moduleForm.title.trim(),
        description: moduleForm.description.trim() || undefined,
        order: modules.length,
        lessons: [],
      }
      setModules([...modules, newModule])
    }

    setIsModalOpen(false)
  }

  /**
   * Deletar módulo
   */
  const handleDelete = (moduleId: string): void => {
    const filteredModules = modules.filter((m) => m.id !== moduleId)
    setModules(
      filteredModules.map((module, index) => ({
        ...module,
        order: index,
      })),
    )
    setDeleteModuleId(null)
  }

  return {
    // Estado
    modules,
    setModules,

    // Modal
    isModalOpen,
    setIsModalOpen,
    editingModule,
    moduleForm,
    setModuleForm,
    moduleFormErrors,

    // Delete dialog
    deleteModuleId,
    setDeleteModuleId,

    // Ações
    openCreateDialog,
    openEditDialog,
    handleSave,
    handleDelete,
  }
}
