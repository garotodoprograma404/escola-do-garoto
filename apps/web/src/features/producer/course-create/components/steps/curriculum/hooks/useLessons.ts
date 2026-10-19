import { useState } from 'react'
import type { Module, Lesson } from '../../../../types'
import type { LessonFormData } from '../types'
import { INITIAL_LESSON_FORM } from '../constants'
import { useValidation } from './useValidation'
import { normalizeFileLessonUrl, normalizeVideoLessonUrl } from '../../../../lib/video-url'

interface UseLessonsProps {
  modules: Module[]
  setModules: (modules: Module[]) => void
}

/**
 * Hook para gerenciar CRUD de aulas
 */
export function useLessons({ modules, setModules }: UseLessonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: Lesson } | null>(
    null,
  )
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null)
  const [lessonForm, setLessonForm] = useState<LessonFormData>(INITIAL_LESSON_FORM)
  const [lessonFormErrors, setLessonFormErrors] = useState<
    Partial<Record<keyof LessonFormData, string>>
  >({})
  const [deleteLessonId, setDeleteLessonId] = useState<{
    moduleId: string
    lessonId: string
  } | null>(null)

  const { validateLessonForm } = useValidation()

  /**
   * Abrir modal para criar aula
   */
  const openCreateDialog = (moduleId: string): void => {
    setCurrentModuleId(moduleId)
    setEditingLesson(null)
    setLessonForm(INITIAL_LESSON_FORM)
    setLessonFormErrors({})
    setIsModalOpen(true)
  }

  /**
   * Abrir modal para editar aula
   */
  const openEditDialog = (moduleId: string, lesson: Lesson): void => {
    setCurrentModuleId(moduleId)
    setEditingLesson({ moduleId, lesson })
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      type: lesson.type,
      duration_minutes: lesson.duration_minutes.toString(),
      is_preview: lesson.is_preview,
      content_url: lesson.content_url || '',
      content_text: lesson.content_text || '',
      quiz_questions: lesson.quiz_questions
        ? lesson.quiz_questions.map((question, questionIndex) => ({
            ...question,
            order: questionIndex,
            options: question.options.map((option, optionIndex) => ({
              ...option,
              order: optionIndex,
            })),
          }))
        : undefined,
      quiz_settings: lesson.quiz_settings ? { ...lesson.quiz_settings } : undefined,
    })
    setLessonFormErrors({})
    setIsModalOpen(true)
  }

  /**
   * Salvar aula (criar ou editar)
   */
  const handleSave = (): void => {
    const errors = validateLessonForm(lessonForm)
    setLessonFormErrors(errors)

    if (Object.keys(errors).length > 0 || !currentModuleId) return

    const normalizedContentUrl =
      lessonForm.type === 'video'
        ? (normalizeVideoLessonUrl(lessonForm.content_url) ?? undefined)
        : lessonForm.type === 'file'
          ? (normalizeFileLessonUrl(lessonForm.content_url) ?? undefined)
          : undefined
    const normalizedContentText =
      lessonForm.type === 'text' ? lessonForm.content_text.trim() || undefined : undefined
    const normalizedQuizQuestions =
      lessonForm.type === 'quiz' && lessonForm.quiz_questions
        ? lessonForm.quiz_questions.map((question, questionIndex) => ({
            ...question,
            order: questionIndex,
            options: question.options.map((option, optionIndex) => ({
              ...option,
              order: optionIndex,
            })),
          }))
        : undefined
    const normalizedQuizSettings =
      lessonForm.type === 'quiz' && lessonForm.quiz_settings
        ? { ...lessonForm.quiz_settings }
        : undefined

    const lessonData: Lesson = {
      id: editingLesson?.lesson.id || `lesson-${crypto.randomUUID()}`,
      title: lessonForm.title.trim(),
      description: lessonForm.description.trim() || undefined,
      type: lessonForm.type,
      duration_minutes: parseInt(lessonForm.duration_minutes),
      is_preview: lessonForm.is_preview,
      content_url: normalizedContentUrl,
      content_text: normalizedContentText,
      quiz_questions: normalizedQuizQuestions,
      quiz_settings: normalizedQuizSettings,
      order: 0, // Será atualizado abaixo
    }

    setModules(
      modules.map((module) => {
        if (module.id === currentModuleId) {
          if (editingLesson) {
            // Editar aula existente
            return {
              ...module,
              lessons: module.lessons.map((l) =>
                l.id === editingLesson.lesson.id ? { ...lessonData, order: l.order } : l,
              ),
            }
          } else {
            // Criar nova aula
            return {
              ...module,
              lessons: [...module.lessons, { ...lessonData, order: module.lessons.length }],
            }
          }
        }
        return module
      }),
    )

    setIsModalOpen(false)
  }

  /**
   * Deletar aula
   */
  const handleDelete = (moduleId: string, lessonId: string): void => {
    setModules(
      modules.map((module) => {
        if (module.id === moduleId) {
          const filteredLessons = module.lessons.filter((l) => l.id !== lessonId)
          return {
            ...module,
            lessons: filteredLessons.map((lesson, index) => ({
              ...lesson,
              order: index,
            })),
          }
        }
        return module
      }),
    )
    setDeleteLessonId(null)
  }

  return {
    // Modal
    isModalOpen,
    setIsModalOpen,
    editingLesson,
    currentModuleId,
    lessonForm,
    setLessonForm,
    lessonFormErrors,

    // Delete dialog
    deleteLessonId,
    setDeleteLessonId,

    // Ações
    openCreateDialog,
    openEditDialog,
    handleSave,
    handleDelete,
  }
}
