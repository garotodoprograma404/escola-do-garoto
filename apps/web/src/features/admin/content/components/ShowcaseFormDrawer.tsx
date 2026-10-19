'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Star, Info } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { CourseMultiSelect } from './CourseMultiSelect.client'
import { searchCoursesAction, getCoursesByIdsAction } from '../actions/course-actions'
import type { CourseOption } from '../services/courseService'
import type { Showcase } from '../types'

const showcaseSchema = z
  .object({
    title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
    description: z.string().optional(),
    type: z.enum(['manual', 'dynamic']),
    courseIds: z.array(z.string()).optional(),
    dynamicRule: z.enum(['bestsellers', 'newest', 'highest_rated']).optional(),
    limit: z.number().min(1).max(20).optional(),
    active: z.boolean(),
  })
  .refine(
    (data) => {
      // Se for manual, deve ter pelo menos 1 curso selecionado
      if (data.type === 'manual') {
        return data.courseIds && data.courseIds.length > 0
      }
      return true
    },
    {
      message: 'Selecione pelo menos um curso para vitrines manuais',
      path: ['courseIds'],
    },
  )

type ShowcaseFormData = z.infer<typeof showcaseSchema>

interface ShowcaseFormDrawerProps {
  open: boolean
  onClose: () => void
  showcase?: Showcase | null
  onSubmit: (data: ShowcaseFormData) => Promise<void>
}

export function ShowcaseFormDrawer({ open, onClose, showcase, onSubmit }: ShowcaseFormDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([])
  const [selectedCourses, setSelectedCourses] = useState<CourseOption[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const isEditing = !!showcase

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ShowcaseFormData>({
    resolver: zodResolver(showcaseSchema),
    defaultValues: showcase
      ? {
          title: showcase.title,
          description: showcase.description || '',
          type: showcase.type,
          courseIds: showcase.courseIds,
          dynamicRule: showcase.dynamicRule,
          limit: showcase.limit || 8,
          active: showcase.active,
        }
      : {
          title: '',
          description: '',
          type: 'dynamic',
          courseIds: [],
          dynamicRule: 'bestsellers',
          limit: 8,
          active: true,
        },
  })

  const showcaseType = watch('type')
  const courseIds = watch('courseIds') || []

  // Load initial courses when drawer opens
  useEffect(() => {
    if (open) {
      loadAvailableCourses()

      // Load selected courses if editing
      if (showcase?.courseIds && showcase.courseIds.length > 0) {
        loadSelectedCourses(showcase.courseIds)
      }
    }
  }, [open, showcase])

  const loadAvailableCourses = async (searchTerm?: string) => {
    setIsLoadingCourses(true)
    try {
      const result = await searchCoursesAction(searchTerm)
      if (result.success) {
        setAvailableCourses(result.data)
      }
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setIsLoadingCourses(false)
    }
  }

  const loadSelectedCourses = async (ids: string[]) => {
    try {
      const result = await getCoursesByIdsAction(ids)
      if (result.success) {
        setSelectedCourses(result.data)
      }
    } catch (error) {
      console.error('Error loading selected courses:', error)
    }
  }

  const handleCourseSearch = useCallback((searchTerm: string) => {
    loadAvailableCourses(searchTerm)
  }, [])

  const handleCourseSelectionChange = (newCourseIds: string[]) => {
    setValue('courseIds', newCourseIds)

    // Update selected courses display
    const selected = availableCourses.filter((course) => newCourseIds.includes(course.id))
    setSelectedCourses(selected)
  }

  const handleFormSubmit = async (data: ShowcaseFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Error submitting showcase:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{isEditing ? 'Editar Vitrine' : 'Criar Nova Vitrine'}</DrawerTitle>
          <DrawerDescription>
            Configure uma seção de cursos para exibir na página inicial
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="overflow-y-auto px-4">
          <div className="space-y-6 pb-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título da Vitrine *</Label>
                <Input id="title" {...register('title')} placeholder="Ex: Mais Vendidos" />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Ex: Os cursos mais populares da plataforma"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="active">Status</Label>
                <Select
                  value={watch('active') ? 'true' : 'false'}
                  onValueChange={(value) => setValue('active', value === 'true')}
                >
                  <SelectTrigger id="active">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativa</SelectItem>
                    <SelectItem value="false">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Star size={16} />
                <span>Tipo de Vitrine</span>
              </div>

              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={showcaseType}
                  onValueChange={(value) => setValue('type', value as 'manual' | 'dynamic')}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dynamic">Dinâmica (Automática)</SelectItem>
                    <SelectItem value="manual">Manual (Seleção)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Rule */}
              {showcaseType === 'dynamic' && (
                <div className="space-y-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-900/20">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="mt-0.5 text-purple-600 dark:text-purple-400" />
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Vitrines dinâmicas são atualizadas automaticamente com base em regras
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dynamicRule">Regra Dinâmica</Label>
                    <Select
                      value={watch('dynamicRule')}
                      onValueChange={(value) =>
                        setValue('dynamicRule', value as 'bestsellers' | 'newest' | 'highest_rated')
                      }
                    >
                      <SelectTrigger id="dynamicRule">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bestsellers">Mais Vendidos</SelectItem>
                        <SelectItem value="newest">Lançamentos</SelectItem>
                        <SelectItem value="highest_rated">Melhor Avaliados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="limit">Limite de Cursos</Label>
                    <Input
                      id="limit"
                      type="number"
                      min={1}
                      max={20}
                      {...register('limit', { valueAsNumber: true })}
                    />
                    {errors.limit && (
                      <p className="mt-1 text-sm text-red-600">{errors.limit.message}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Máximo: 20 cursos
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Selection */}
              {showcaseType === 'manual' && (
                <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="mt-0.5 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Vitrines manuais exibem cursos selecionados por você
                    </p>
                  </div>

                  <div>
                    <Label>Selecionar Cursos *</Label>
                    <div className="mt-2">
                      <CourseMultiSelect
                        selectedCourseIds={courseIds}
                        onSelectionChange={handleCourseSelectionChange}
                        availableCourses={availableCourses}
                        selectedCourses={selectedCourses}
                        onSearch={handleCourseSearch}
                        isLoading={isLoadingCourses}
                      />
                    </div>
                    {errors.courseIds && (
                      <p className="mt-1 text-sm text-red-600">Selecione pelo menos um curso</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DrawerFooter className="border-t">
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-brand-500 text-black hover:bg-brand-400"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Vitrine'}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
