import type { CompleteCourseFormData } from '../types'

type CourseModules = CompleteCourseFormData['modules']

/** Totais do currículo para a revisão final: módulos, aulas, minutos e aulas de prévia grátis. */
export function summarizeCurriculum(modules: CourseModules | undefined) {
  const list = modules ?? []
  const lessons = list.flatMap((module) => module.lessons)

  return {
    modules: list.length,
    lessons: lessons.length,
    minutes: lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0),
    previews: lessons.filter((lesson) => lesson.is_preview).length,
  }
}
