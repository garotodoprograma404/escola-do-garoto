import type { ModuleFormData, LessonFormData } from '../types'
import { isVideoLessonUrlSupported, normalizeFileLessonUrl } from '../../../../lib/video-url'

/**
 * Hook para validação de formulários
 */
export function useValidation() {
  /**
   * Valida formulário de módulo
   */
  const validateModuleForm = (form: ModuleFormData): Partial<ModuleFormData> => {
    const errors: Partial<ModuleFormData> = {}

    if (!form.title.trim()) {
      errors.title = 'Título é obrigatório'
    } else if (form.title.trim().length < 3) {
      errors.title = 'Título deve ter no mínimo 3 caracteres'
    }

    return errors
  }

  /**
   * Valida formulário de aula
   */
  const validateLessonForm = (
    form: LessonFormData,
  ): Partial<Record<keyof LessonFormData, string>> => {
    const errors: Partial<Record<keyof LessonFormData, string>> = {}

    // Validar título
    if (!form.title.trim()) {
      errors.title = 'Título é obrigatório'
    } else if (form.title.trim().length < 3) {
      errors.title = 'Título deve ter no mínimo 3 caracteres'
    }

    // Validar duração
    const duration = parseInt(form.duration_minutes)
    if (!form.duration_minutes || isNaN(duration) || duration < 1) {
      errors.duration_minutes = 'Duração deve ser maior que 0'
    }

    // Validação específica para vídeo
    if (form.type === 'video') {
      if (!form.content_url.trim()) {
        errors.content_url = 'URL é obrigatória'
      } else if (!isVideoLessonUrlSupported(form.content_url)) {
        errors.content_url =
          'Use uma URL válida de YouTube, Vimeo ou arquivo direto (.mp4, .webm, .ogg, .m3u8, .mpd)'
      }
    }

    // Validação específica para arquivo
    if (form.type === 'file') {
      if (!form.content_url.trim()) {
        errors.content_url = 'URL é obrigatória'
      } else if (!normalizeFileLessonUrl(form.content_url)) {
        errors.content_url = 'URL inválida'
      }
    }

    if (form.type === 'text') {
      // Remover tags HTML para validar conteúdo real
      const textContent = form.content_text.replace(/<[^>]*>/g, '').trim()

      if (!textContent) {
        errors.content_text = 'Conteúdo é obrigatório'
      } else if (textContent.length < 10) {
        errors.content_text = 'Conteúdo deve ter no mínimo 10 caracteres'
      }
    }

    if (form.type === 'quiz') {
      if (!form.quiz_questions || form.quiz_questions.length === 0) {
        errors.quiz_questions = 'Adicione pelo menos 1 questão ao quiz'
      }
    }

    return errors
  }

  return {
    validateModuleForm,
    validateLessonForm,
  }
}
