/**
 * Percentual do curso: aulas concluídas ÷ aulas
 * publicadas, arredondado ao inteiro mais próximo. Curso sem aula publicada = 0%.
 */
export function computeProgress(totalLessons: number, completedLessons: number) {
  const total = Math.max(0, Math.trunc(totalLessons))
  if (total === 0) return { totalLessons: 0, completedLessons: 0, progressPercentage: 0 }
  const completed = Math.min(total, Math.max(0, Math.trunc(completedLessons)))
  return {
    totalLessons: total,
    completedLessons: completed,
    progressPercentage: Math.min(100, Math.max(0, Math.round((completed / total) * 100))),
  }
}

/** Percentual de uma aula (vídeo) pelo tempo assistido. */
export function lessonWatchPercentage(watchTimeSeconds: number, durationMinutes: number | null) {
  const durationSeconds = (durationMinutes ?? 0) * 60
  if (durationSeconds <= 0) return 0
  return Math.min(100, Math.round((Math.max(0, watchTimeSeconds) / durationSeconds) * 100))
}

/**
 * Minutos efetivamente assistidos de uma aula: concluída conta a duração inteira; senão, o tempo
 * assistido limitado à duração (regra usada em "Meus cursos" e no painel).
 */
export function watchedMinutes(input: {
  completed: boolean
  watchTimeSeconds: number
  durationMinutes: number | null
}): number {
  const duration = input.durationMinutes ?? 0
  if (input.completed) return duration
  if (input.watchTimeSeconds > 0 && duration > 0) {
    return Math.min(duration, input.watchTimeSeconds / 60)
  }
  return 0
}
