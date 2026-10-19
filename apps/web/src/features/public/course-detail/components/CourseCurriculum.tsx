// =====================================================
// COURSE CURRICULUM - SERVER COMPONENT
// =====================================================

'use client'

import { useState } from 'react'
import { PlayCircle, FileText, HelpCircle, File, Clock, Lock, ChevronDown } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { parseVimeoVideo } from '@/shared/lib/vimeo'
import { useToast } from '@/shared/hooks/use-toast'
import type { CourseModule } from '../types'

interface CourseCurriculumProps {
  modules: CourseModule[]
}

const lessonIcons = {
  video: PlayCircle,
  text: FileText,
  quiz: HelpCircle,
  file: File,
}

const lessonIconColors = {
  video: 'text-primary',
  text: 'text-blue-500',
  quiz: 'text-purple-500',
  file: 'text-green-500',
}

type LessonPreviewState = {
  title: string
  mode: 'embed' | 'video' | 'text'
  src?: string
  text?: string
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function normalizeTextContent(content: string | null): string {
  return (content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveLessonPreview(lesson: CourseModule['lessons'][number]): LessonPreviewState | null {
  if (!lesson.is_free_preview) {
    return null
  }

  if (lesson.type === 'text') {
    const normalizedText = normalizeTextContent(lesson.content_text)
    if (normalizedText.length > 0) {
      return {
        title: lesson.title,
        mode: 'text',
        text: normalizedText,
      }
    }
    return null
  }

  const url = lesson.content_url?.trim()
  if (!url) {
    return null
  }

  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return {
      title: lesson.title,
      mode: 'embed',
      src: `https://www.youtube.com/embed/${youtubeId}`,
    }
  }

  const vimeoVideo = parseVimeoVideo(url)
  if (vimeoVideo) {
    return {
      title: lesson.title,
      mode: 'embed',
      src: vimeoVideo.embedUrl,
    }
  }

  const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
  if (isDirectVideo) {
    return {
      title: lesson.title,
      mode: 'video',
      src: url,
    }
  }

  return {
    title: lesson.title,
    mode: 'embed',
    src: url,
  }
}

export function CourseCurriculum({ modules }: CourseCurriculumProps) {
  const [expandedAll, setExpandedAll] = useState(false)
  const [lessonPreview, setLessonPreview] = useState<LessonPreviewState | null>(null)
  const { toast } = useToast()

  const totalLessons = modules.reduce((sum, mod) => sum + mod.lessons.length, 0)
  const totalDuration = modules.reduce(
    (sum, mod) => sum + mod.lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0),
    0,
  )

  const allModuleIds = modules.map((m) => String(m.id))

  const openLessonPreview = (lesson: CourseModule['lessons'][number]) => {
    const preview = resolveLessonPreview(lesson)
    if (preview) {
      setLessonPreview(preview)
      return
    }

    toast({
      title: 'Preview indisponível',
      description: 'Esta aula está marcada como preview, mas ainda não possui conteúdo para abrir.',
      variant: 'destructive',
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conteúdo do Curso</h2>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {modules.length} módulos • {totalLessons} aulas • {Math.floor(totalDuration / 60)}h{' '}
            {totalDuration % 60}min
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandedAll(!expandedAll)}
            className="font-bold text-primary hover:text-primary/80"
          >
            {expandedAll ? 'Recolher tudo' : 'Expandir tudo'}
          </Button>
        </div>
      </div>

      <Accordion
        type="multiple"
        className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        value={expandedAll ? allModuleIds : undefined}
      >
        {modules.map((module, index) => {
          const moduleDuration = module.lessons.reduce(
            (sum, l) => sum + (l.duration_minutes || 0),
            0,
          )

          return (
            <AccordionItem
              key={module.id}
              value={String(module.id)}
              className="border-b border-slate-100 last:border-none dark:border-slate-800"
            >
              <AccordionTrigger className="bg-slate-50 px-4 py-4 transition-colors hover:bg-slate-100 hover:no-underline dark:bg-slate-950 dark:hover:bg-slate-900">
                <div className="flex flex-1 items-start justify-between gap-4 pr-4 text-left sm:items-center">
                  <div className="flex flex-1 items-start gap-3">
                    <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 transition-transform dark:text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white">
                        Módulo {index + 1}: {module.title}
                      </div>
                      {module.description && (
                        <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                          {module.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-sm text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:gap-4">
                    <span className="whitespace-nowrap">{module.lessons.length} aulas</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {Math.floor(moduleDuration / 60)}h {moduleDuration % 60}min
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const Icon = lessonIcons[lesson.type] || FileText
                    const iconColor = lessonIconColors[lesson.type] || 'text-slate-400'
                    const canOpenPreview = resolveLessonPreview(lesson) !== null

                    return (
                      <button
                        type="button"
                        key={lesson.id}
                        onClick={() => {
                          if (canOpenPreview) {
                            openLessonPreview(lesson)
                          }
                        }}
                        className={`group flex w-full items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors dark:border-slate-800 sm:items-center ${
                          canOpenPreview
                            ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            : 'cursor-default'
                        }`}
                        aria-label={
                          canOpenPreview ? `Abrir preview da aula ${lesson.title}` : undefined
                        }
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <Icon
                            className={`h-4 w-4 ${iconColor} mt-0.5 shrink-0 transition-transform group-hover:scale-110 sm:mt-0`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">
                              {lessonIndex + 1}. {lesson.title}
                            </div>
                            {lesson.description && (
                              <div className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                                {lesson.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {lesson.is_free_preview && (
                            <Badge
                              variant="secondary"
                              className="border-primary/20 bg-primary/10 text-xs text-primary hover:bg-primary/20"
                            >
                              Preview
                            </Badge>
                          )}
                          {lesson.duration_minutes && (
                            <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                              {lesson.duration_minutes} min
                            </span>
                          )}
                          {!lesson.is_free_preview && (
                            <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      <Dialog
        open={Boolean(lessonPreview)}
        onOpenChange={(open) => !open && setLessonPreview(null)}
      >
        <DialogContent className="max-w-4xl border-slate-800 bg-slate-950 p-0 text-white">
          <DialogHeader>
            <DialogTitle className="px-4 pt-4 text-base sm:text-lg">
              {lessonPreview?.title}
            </DialogTitle>
            <DialogDescription className="px-4 pb-3 text-slate-600 dark:text-slate-400">
              Pré-visualização da aula
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 pt-0">
            {lessonPreview?.mode === 'embed' && lessonPreview.src && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black">
                <iframe
                  src={lessonPreview.src}
                  title={lessonPreview.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
            {lessonPreview?.mode === 'video' && lessonPreview.src && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black">
                <video
                  controls
                  preload="metadata"
                  src={lessonPreview.src}
                  className="h-full w-full"
                >
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              </div>
            )}
            {lessonPreview?.mode === 'text' && (
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm leading-relaxed text-slate-200">
                {lessonPreview.text}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
