import type { XpSource } from '../types'

const LABELS: Record<XpSource, string> = {
  lesson_completed: 'Aula concluída',
  quiz_passed: 'Quiz aprovado',
  quiz_perfect: 'Gabaritou o quiz',
  course_completed: 'Curso concluído',
  review: 'Avaliou o curso',
  question: 'Fez uma pergunta',
  streak_day: 'Sequência de estudos',
}

/** Texto do histórico de pontos ("Aula concluída", "Sequência de estudos"...). */
export function xpSourceLabel(source: XpSource): string {
  return LABELS[source] ?? 'Pontos'
}

/** "2026-10" → "outubro de 2026" (mês do ranking). */
export function rankingMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return month
  return new Date(Date.UTC(year, monthNumber - 1, 15)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
