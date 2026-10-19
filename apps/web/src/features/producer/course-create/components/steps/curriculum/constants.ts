import { Video, FileText, HelpCircle, File } from 'lucide-react'

// Ícones por tipo de aula
export const LESSON_TYPE_ICONS = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
  file: File,
} as const

// Rótulos por tipo de conteúdo para UI
export const LESSON_TYPE_LABELS = {
  video: 'Vídeo',
  text: 'Leitura',
  quiz: 'Quiz',
  file: 'Material',
} as const

// Form inicial de módulo
export const INITIAL_MODULE_FORM = {
  title: '',
  description: '',
} as const

// Form inicial de aula
export const INITIAL_LESSON_FORM = {
  title: '',
  description: '',
  type: 'video' as const,
  duration_minutes: '',
  is_preview: false,
  content_url: '',
  content_text: '',
} as const
