// =====================================================
// CURRICULUM SIDEBAR - CLIENT COMPONENT
// =====================================================

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Play, Check } from 'lucide-react'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'
import type { CourseModule, CourseLesson } from '../types'

interface CurriculumSidebarProps {
  modules: CourseModule[]
  currentLessonId: number
  onLessonSelect: (lesson: CourseLesson) => void
}

interface ContentCounters {
  lessonCount: number
  lessonCompletedCount: number
  activityCount: number
  activityCompletedCount: number
}

function countModuleContent(lessons: CourseLesson[]): ContentCounters {
  const lessonEntries = lessons.filter((lesson) => lesson.type !== 'quiz')
  const activityEntries = lessons.filter((lesson) => lesson.type === 'quiz')

  return {
    lessonCount: lessonEntries.length,
    lessonCompletedCount: lessonEntries.filter((lesson) => lesson.isCompleted).length,
    activityCount: activityEntries.length,
    activityCompletedCount: activityEntries.filter((lesson) => lesson.isCompleted).length,
  }
}

function formatContentSummary(counters: ContentCounters): string {
  const parts: string[] = []

  if (counters.lessonCount > 0) {
    parts.push(
      `${counters.lessonCompletedCount}/${counters.lessonCount} ${counters.lessonCount === 1 ? 'aula' : 'aulas'}`,
    )
  }

  if (counters.activityCount > 0) {
    parts.push(
      `${counters.activityCompletedCount}/${counters.activityCount} ${
        counters.activityCount === 1 ? 'atividade' : 'atividades'
      }`,
    )
  }

  return parts.length > 0 ? parts.join(' • ') : '0 conteúdos'
}

function formatContentTotals(counters: ContentCounters): string {
  const parts: string[] = []

  if (counters.lessonCount > 0) {
    parts.push(`${counters.lessonCount} ${counters.lessonCount === 1 ? 'aula' : 'aulas'}`)
  }

  if (counters.activityCount > 0) {
    parts.push(
      `${counters.activityCount} ${counters.activityCount === 1 ? 'atividade' : 'atividades'}`,
    )
  }

  return parts.length > 0 ? parts.join(' • ') : '0 conteúdos'
}

export function CurriculumSidebar({
  modules,
  currentLessonId,
  onLessonSelect,
}: CurriculumSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(
    new Set(modules.map((m) => m.id)),
  )

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const totalCounters = countModuleContent(modules.flatMap((module) => module.lessons))

  return (
    <div className="flex h-full flex-col border-l bg-card">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Conteúdo do Curso</h3>
        <p className="text-sm text-muted-foreground">{formatContentTotals(totalCounters)}</p>
      </div>

      {/* Modules List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {modules.map((module) => {
            const isExpanded = expandedModules.has(module.id)
            const moduleCounters = countModuleContent(module.lessons)

            return (
              <div key={module.id} className="mb-2">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.id)}
                  className="flex w-full items-start gap-2 rounded-lg p-3 text-left transition-colors hover:bg-accent"
                >
                  {isExpanded ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal break-words pr-2 text-[1.02rem] font-semibold leading-tight">
                      {module.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatContentSummary(moduleCounters)}
                    </p>
                  </div>
                </button>

                {/* Lessons */}
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {module.lessons.map((lesson) => {
                      const isCurrent = lesson.id === currentLessonId

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onLessonSelect(lesson)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-lg p-3 text-left text-sm transition-colors',
                            isCurrent ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                          )}
                        >
                          {/* Icon */}
                          <div className="mt-0.5 shrink-0">
                            {lesson.isCompleted ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : isCurrent ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className="whitespace-normal break-words pr-2 font-medium leading-tight">
                              {lesson.title}
                            </p>
                            {lesson.durationMinutes && (
                              <p
                                className={cn(
                                  'text-xs',
                                  isCurrent
                                    ? 'text-primary-foreground/80'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {lesson.durationMinutes} min
                              </p>
                            )}
                          </div>

                          {/* Progress */}
                          {!lesson.isCompleted && lesson.progressPercentage > 0 && (
                            <div className="shrink-0 text-xs">{lesson.progressPercentage}%</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
