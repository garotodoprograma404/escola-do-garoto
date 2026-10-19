'use client'

import { useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  File,
  FileQuestion,
  FileText,
  Video,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { calculateTotalDuration, formatDuration } from '../../lib/helpers'
import { summarizeCurriculum } from '../../lib/curriculumSummary'
import type { CompleteCourseFormData } from '../../types'
import { ReviewSection } from './ReviewSection.client'

const LESSON_TYPE_ICONS = { video: Video, text: FileText, quiz: FileQuestion, file: File }

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="mb-1 text-sm text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="text-2xl font-bold text-slate-900 dark:text-white">{value}</dd>
    </div>
  )
}

/** Revisão do currículo: totais e a lista de módulos, que o produtor expande para ver as aulas. */
export function ReviewCurriculum({ modules }: { modules: CompleteCourseFormData['modules'] }) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const list = modules ?? []
  const summary = summarizeCurriculum(modules)
  const expandedCount = list.filter((module) => expandedModules[String(module.id)]).length

  const setAllExpanded = (expanded: boolean) =>
    setExpandedModules(Object.fromEntries(list.map((module) => [String(module.id), expanded])))

  const toggleModule = (moduleId: string) =>
    setExpandedModules((previous) => ({ ...previous, [moduleId]: !previous[moduleId] }))

  return (
    <ReviewSection
      title="Currículo"
      icon={<BookOpen className="h-5 w-5" />}
      collapsible
      defaultExpanded={false}
    >
      <dl className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 md:grid-cols-4">
        <StatItem label="Módulos" value={summary.modules} />
        <StatItem label="Aulas" value={summary.lessons} />
        <StatItem label="Duração" value={formatDuration(summary.minutes)} />
        <StatItem label="Previews" value={summary.previews} />
      </dl>

      {list.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {expandedCount} de {list.length} módulos expandidos
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setAllExpanded(true)}
            >
              Expandir todos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => setAllExpanded(false)}
            >
              Recolher todos
            </Button>
          </div>
        </div>
      )}

      {list.length > 0 ? (
        <div className="mt-6 space-y-4">
          {list.map((module, moduleIndex) => {
            const moduleId = String(module.id)
            const isExpanded = expandedModules[moduleId] === true

            return (
              <div
                key={module.id}
                className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
              >
                <div className="bg-slate-50 p-4 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="mb-1 font-semibold text-slate-900 dark:text-white">
                        Módulo {moduleIndex + 1}: {module.title}
                      </h4>
                      {module.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {module.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-start gap-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {module.lessons.length} {module.lessons.length === 1 ? 'aula' : 'aulas'}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {formatDuration(calculateTotalDuration(module.lessons).total)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => toggleModule(moduleId)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="mr-1 h-3.5 w-3.5" />
                            Recolher
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3.5 w-3.5" />
                            Expandir
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-900">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const LessonIcon = LESSON_TYPE_ICONS[lesson.type]

                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        >
                          <div className="flex-shrink-0">
                            <LessonIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                Aula {lessonIndex + 1}: {lesson.title}
                              </p>
                              {lesson.is_preview && (
                                <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                                  <Eye className="h-3 w-3" />
                                  Preview
                                </span>
                              )}
                            </div>
                            {lesson.description && (
                              <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">
                                {lesson.description}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-xs text-slate-600 dark:text-slate-400">
                            {lesson.duration_minutes}min
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    Aulas ocultas. Clique em Expandir para revisar os detalhes deste módulo.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-slate-600 dark:text-slate-400">
          Nenhum módulo adicionado
        </div>
      )}
    </ReviewSection>
  )
}
