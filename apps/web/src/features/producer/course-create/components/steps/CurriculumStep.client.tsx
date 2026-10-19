'use client'

import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Edit2, Trash2, GripVertical, BookOpen } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion'
import type { CompleteCourseFormData } from '../../types'
import { useModules, useLessons, useDragAndDrop } from './curriculum/hooks'
import { LESSON_TYPE_ICONS, LESSON_TYPE_LABELS } from './curriculum/constants'
import { SortableModuleItem } from './curriculum/components/SortableModuleItem.client'
import { SortableLessonItem } from './curriculum/components/SortableLessonItem.client'
import {
  ModuleFormModal,
  LessonFormModal,
  DeleteModuleDialog,
  DeleteLessonDialog,
} from './curriculum/modals'

interface CurriculumStepProps {
  data: Partial<CompleteCourseFormData>
  onUpdate: (data: Partial<CompleteCourseFormData>) => void
  onNext: () => void
}

/**
 * Step do wizard para gerenciar currículo do curso (módulos e aulas)
 * Refatorado para melhor manutenibilidade e testabilidade
 */
export function CurriculumStep({ data, onUpdate }: CurriculumStepProps) {
  // Custom hooks encapsulam toda a lógica
  const modulesHook = useModules({
    initialModules: data.modules || [],
    onUpdate: (modules) => onUpdate({ modules }),
  })

  const lessonsHook = useLessons({
    modules: modulesHook.modules,
    setModules: modulesHook.setModules,
  })

  const dragDropHook = useDragAndDrop({
    modules: modulesHook.modules,
    setModules: modulesHook.setModules,
  })

  const { modules } = modulesHook

  return (
    <DndContext
      sensors={dragDropHook.sensors}
      collisionDetection={dragDropHook.collisionDetection}
      onDragEnd={dragDropHook.onDragEnd}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">
            Currículo do Curso
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Organize o conteúdo em módulos e aulas
          </p>
        </div>

        {/* Add Module Button - Apenas quando tem módulos */}
        {modules.length > 0 && (
          <Button type="button" onClick={modulesHook.openCreateDialog} className="w-full sm:w-auto">
            <Plus size={16} className="mr-2" />
            Adicionar Módulo
          </Button>
        )}

        {/* Modules List */}
        {modules.length > 0 ? (
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <Accordion type="single" collapsible className="space-y-4">
              {modules.map((module, index) => {
                const stats = {
                  lessonCount: module.lessons.length,
                  totalDuration: module.lessons.reduce(
                    (sum, lesson) => sum + lesson.duration_minutes,
                    0,
                  ),
                  previewCount: module.lessons.filter((lesson) => lesson.is_preview).length,
                  hours: Math.floor(
                    module.lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0) / 60,
                  ),
                  minutes:
                    module.lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0) % 60,
                }
                return (
                  <SortableModuleItem key={module.id} module={module} index={index}>
                    {({ dragHandleProps }) => (
                      <AccordionItem value={module.id} className="border-none">
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              {/* Drag Handle */}
                              <div
                                {...dragHandleProps}
                                className="mt-1 cursor-grab touch-none text-slate-600 hover:text-slate-600 active:cursor-grabbing dark:text-slate-400 dark:hover:text-slate-300"
                              >
                                <GripVertical size={20} />
                              </div>

                              {/* Module Icon */}
                              <div className="mt-1">
                                <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
                              </div>

                              {/* Module Info */}
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <h3 className="font-semibold text-slate-900 dark:text-white">
                                    Módulo {index + 1}: {module.title}
                                  </h3>

                                  {/* Action Buttons */}
                                  <div className="flex flex-shrink-0 items-center gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Editar módulo ${index + 1}`}
                                      onClick={() => modulesHook.openEditDialog(module)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 size={14} />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Excluir módulo ${index + 1}`}
                                      onClick={() => modulesHook.setDeleteModuleId(module.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                    <AccordionTrigger
                                      aria-label={`Abrir ou fechar módulo ${index + 1}`}
                                      className="h-8 w-8 p-0 hover:no-underline [&[data-state=open]>svg]:rotate-180"
                                    />
                                  </div>
                                </div>

                                {/* Description */}
                                {module.description && (
                                  <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                                    {module.description}
                                  </p>
                                )}

                                {/* Stats */}
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <span>
                                    {stats.lessonCount}{' '}
                                    {stats.lessonCount === 1 ? 'conteúdo' : 'conteúdos'}
                                  </span>
                                  {stats.lessonCount > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>
                                        {stats.hours > 0 && `${stats.hours}h `}
                                        {stats.minutes}min
                                      </span>
                                    </>
                                  )}
                                  {stats.previewCount > 0 && (
                                    <>
                                      <span>•</span>
                                      <Badge variant="secondary" className="text-xs">
                                        {stats.previewCount} preview
                                        {stats.previewCount > 1 ? 's' : ''}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          <AccordionContent>
                            <CardContent className="pt-0">
                              {/* Lessons List */}
                              <SortableContext
                                items={module.lessons.map((l) => l.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="mb-4 space-y-2">
                                  {module.lessons.map((lesson, lessonIndex) => {
                                    const LessonIcon = LESSON_TYPE_ICONS[lesson.type]
                                    const lessonTypeLabel = LESSON_TYPE_LABELS[lesson.type]
                                    return (
                                      <SortableLessonItem key={lesson.id} lesson={lesson}>
                                        {({ dragHandleProps }) => (
                                          <div className="dark:hover:bg-slate-750 flex items-center gap-2 rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:bg-slate-800">
                                            {/* Drag Handle */}
                                            <div
                                              {...dragHandleProps}
                                              className="cursor-grab touch-none text-slate-600 hover:text-slate-600 active:cursor-grabbing dark:text-slate-400 dark:hover:text-slate-300"
                                            >
                                              <GripVertical size={16} />
                                            </div>

                                            {/* Lesson Icon */}
                                            <LessonIcon
                                              size={16}
                                              className="flex-shrink-0 text-slate-600 dark:text-slate-400"
                                            />

                                            {/* Lesson Info */}
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                                  {lessonTypeLabel} {lessonIndex + 1}:{' '}
                                                  {lesson.title}
                                                </span>
                                                {lesson.is_preview && (
                                                  <Badge
                                                    variant="outline"
                                                    className="flex-shrink-0 text-xs"
                                                  >
                                                    Preview
                                                  </Badge>
                                                )}
                                              </div>
                                              {lesson.description && (
                                                <p className="truncate text-xs text-slate-600 dark:text-slate-400">
                                                  {lesson.description}
                                                </p>
                                              )}
                                            </div>

                                            {/* Duration */}
                                            <span className="flex-shrink-0 text-xs text-slate-600 dark:text-slate-400">
                                              {lesson.duration_minutes}min
                                            </span>

                                            {/* Action Buttons */}
                                            <div className="flex flex-shrink-0 items-center gap-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Editar conteúdo ${lesson.title}`}
                                                onClick={() =>
                                                  lessonsHook.openEditDialog(module.id, lesson)
                                                }
                                                className="h-7 w-7 p-0"
                                              >
                                                <Edit2 size={12} />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                aria-label={`Excluir conteúdo ${lesson.title}`}
                                                onClick={() =>
                                                  lessonsHook.setDeleteLessonId({
                                                    moduleId: module.id,
                                                    lessonId: lesson.id,
                                                  })
                                                }
                                                className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                              >
                                                <Trash2 size={12} />
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                      </SortableLessonItem>
                                    )
                                  })}
                                  {module.lessons.length === 0 && (
                                    <p className="py-4 text-center text-sm text-slate-600 dark:text-slate-400">
                                      Nenhum conteúdo adicionado ainda
                                    </p>
                                  )}
                                </div>
                              </SortableContext>

                              {/* Add Lesson Button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => lessonsHook.openCreateDialog(module.id)}
                                className="w-full"
                              >
                                <Plus size={14} className="mr-2" />
                                Adicionar Conteúdo
                              </Button>
                            </CardContent>
                          </AccordionContent>
                        </Card>
                      </AccordionItem>
                    )}
                  </SortableModuleItem>
                )
              })}
            </Accordion>
          </SortableContext>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <BookOpen size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <h3 className="mb-2 text-lg font-medium text-slate-900 dark:text-white">
                  Nenhum módulo adicionado
                </h3>
                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Comece criando o primeiro módulo do seu curso
                </p>
                <Button type="button" onClick={modulesHook.openCreateDialog}>
                  <Plus size={16} className="mr-2" />
                  Criar Primeiro Módulo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Summary Card - Apenas quando tem módulos */}
        {modules.length > 0 && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-600 p-2 dark:bg-blue-500">
                  <BookOpen size={20} className="text-white" />
                </div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Resumo do Currículo
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="mb-1 text-sm text-blue-600 dark:text-blue-400">Módulos</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {modules.length}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-blue-600 dark:text-blue-400">Conteúdos</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {modules.reduce((sum, m) => sum + m.lessons.length, 0)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-blue-600 dark:text-blue-400">Duração</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {(() => {
                      const totalMinutes = modules.reduce(
                        (sum, m) => sum + m.lessons.reduce((s, l) => s + l.duration_minutes, 0),
                        0,
                      )
                      const hours = Math.floor(totalMinutes / 60)
                      const minutes = totalMinutes % 60
                      return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
                    })()}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-blue-600 dark:text-blue-400">Previews</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {modules.reduce(
                      (sum, m) => sum + m.lessons.filter((l) => l.is_preview).length,
                      0,
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <ModuleFormModal
          isOpen={modulesHook.isModalOpen}
          editing={modulesHook.editingModule}
          form={modulesHook.moduleForm}
          errors={modulesHook.moduleFormErrors}
          onFormChange={modulesHook.setModuleForm}
          onSave={modulesHook.handleSave}
          onClose={() => modulesHook.setIsModalOpen(false)}
        />

        <LessonFormModal
          isOpen={lessonsHook.isModalOpen}
          editing={lessonsHook.editingLesson}
          form={lessonsHook.lessonForm}
          errors={lessonsHook.lessonFormErrors}
          onFormChange={lessonsHook.setLessonForm}
          onSave={lessonsHook.handleSave}
          onClose={() => lessonsHook.setIsModalOpen(false)}
        />

        <DeleteModuleDialog
          moduleId={modulesHook.deleteModuleId}
          modules={modules}
          onConfirm={modulesHook.handleDelete}
          onCancel={() => modulesHook.setDeleteModuleId(null)}
        />

        <DeleteLessonDialog
          deleteLessonId={lessonsHook.deleteLessonId}
          onConfirm={lessonsHook.handleDelete}
          onCancel={() => lessonsHook.setDeleteLessonId(null)}
        />
      </div>
    </DndContext>
  )
}
