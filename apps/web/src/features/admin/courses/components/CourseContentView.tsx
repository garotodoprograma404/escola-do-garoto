'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion'
import { BookOpen, Video, FileText, HelpCircle, Clock, Eye, Loader2 } from 'lucide-react'
import { getCourseContentAction } from '../actions/get-course-content'

interface CourseContentViewProps {
  courseId: string
}

interface Module {
  id: number
  course_id: number
  title: string
  description: string | null
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

interface Lesson {
  id: number
  module_id: number
  title: string
  description: string | null
  type: 'video' | 'text' | 'quiz' | 'file'
  content_url: string | null
  content_text: string | null
  duration_minutes: number | null
  display_order: number
  is_free_preview: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}

interface Stats {
  totalModules: number
  totalLessons: number
  totalDuration: number
  freePreviewCount: number
}

export function CourseContentView({ courseId }: CourseContentViewProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadContent() {
      setLoading(true)
      setError(null)

      try {
        const result = await getCourseContentAction(courseId)

        if (result.success && result.data) {
          setModules(result.data.modules)
          setLessons(result.data.lessons)
          setStats(result.data.stats)
        } else {
          setError(result.error || 'Erro ao carregar conteúdo')
        }
      } catch (err) {
        console.error('Error loading content:', err)
        setError('Erro ao carregar conteúdo')
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      loadContent()
    }
  }, [courseId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <BookOpen className="mx-auto mb-3 h-12 w-12 text-red-500" />
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Este curso ainda não possui módulos ou aulas.</p>
      </div>
    )
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'text':
        return <FileText className="h-4 w-4" />
      case 'quiz':
        return <HelpCircle className="h-4 w-4" />
      default:
        return <BookOpen className="h-4 w-4" />
    }
  }

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Vídeo'
      case 'text':
        return 'Texto'
      case 'quiz':
        return 'Quiz'
      case 'file':
        return 'Arquivo'
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Módulos</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalModules}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Video className="h-4 w-4" />
              <span className="text-sm">Aulas</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalLessons}</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Duração</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalDuration}min</p>
          </div>
          <div className="rounded-lg border p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="text-sm">Preview Grátis</span>
            </div>
            <p className="text-2xl font-bold">{stats.freePreviewCount}</p>
          </div>
        </div>
      )}

      {/* Módulos e Aulas */}
      <Accordion type="multiple" className="space-y-2">
        {modules.map((module) => {
          const moduleLessons = lessons.filter((l) => l.module_id === module.id)
          const moduleDuration = moduleLessons.reduce(
            (sum, l) => sum + (l.duration_minutes || 0),
            0,
          )

          return (
            <AccordionItem
              key={module.id}
              value={`module-${module.id}`}
              className="rounded-lg border"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex w-full items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {module.display_order}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">{module.title}</p>
                      {module.description && (
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{moduleLessons.length} aulas</span>
                    <span>{moduleDuration}min</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="mt-2 space-y-2">
                  {moduleLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div className="text-muted-foreground">{getLessonIcon(lesson.type)}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-xs text-muted-foreground">{lesson.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lesson.is_free_preview && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="mr-1 h-3 w-3" />
                            Preview
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getLessonTypeLabel(lesson.type)}
                        </Badge>
                        {lesson.duration_minutes && (
                          <span className="text-sm text-muted-foreground">
                            {lesson.duration_minutes}min
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
