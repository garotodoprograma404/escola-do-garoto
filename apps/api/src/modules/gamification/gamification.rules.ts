/**
 * Regras da gamificação (puras, sem banco): quanto vale cada ação, os níveis, a sequência de dias
 * e o catálogo de medalhas. Mudou aqui, mudou para todo mundo (os totais são recalculados a partir
 * dos eventos de `xp_events`).
 */

/** Pontos por ação. Cada fato pontua uma vez só (chave única em `xp_events`). */
export const XP = {
  lessonCompleted: 10,
  quizPassed: 20,
  quizPerfect: 10,
  courseCompleted: 100,
  review: 15,
  question: 5,
  streakDay: 5,
} as const

/** Perguntas que valem ponto por dia (anti "farm" de perguntas vazias). */
export const QUESTIONS_WITH_XP_PER_DAY = 3

export type XpSource =
  | 'lesson_completed'
  | 'quiz_passed'
  | 'quiz_perfect'
  | 'course_completed'
  | 'review'
  | 'question'
  | 'streak_day'

const LEVEL_NAMES = [
  'Iniciante',
  'Aprendiz',
  'Curioso',
  'Dedicado',
  'Persistente',
  'Focado',
  'Avançado',
  'Especialista',
  'Mestre',
  'Lenda',
] as const

/** XP total para chegar ao nível `level` (1 → 0, 2 → 100, 3 → 300, 4 → 600...: cada nível pede mais). */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level
}

export type LevelInfo = {
  level: number
  name: string
  /** XP em que o nível atual começou e em que o próximo começa. */
  currentLevelXp: number
  nextLevelXp: number
  /** 0 a 100: quanto do caminho até o próximo nível já foi feito. */
  progressPercentage: number
}

export function levelFor(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp))
  let level = 1
  while (xpForLevel(level + 1) <= total) level += 1
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const name =
    level <= LEVEL_NAMES.length ? LEVEL_NAMES[level - 1]! : `${LEVEL_NAMES.at(-1)} ${level}`
  return {
    level,
    name,
    currentLevelXp,
    nextLevelXp,
    progressPercentage: Math.floor(
      ((total - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
    ),
  }
}

/** Data (AAAA-MM-DD) no horário de Brasília: o "dia de estudo" do aluno. */
export function brazilDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function previousDay(date: string): string {
  const day = new Date(`${date}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
}

/**
 * Sequência de dias estudando (com pelo menos uma aula concluída). Mesmo dia: nada muda. Dia
 * seguinte ao último: soma 1. Pulou um dia: recomeça em 1.
 */
export function nextStreak(
  lastActivityDate: string | null,
  currentStreak: number,
  today: string,
): { streakDays: number; newDay: boolean } {
  if (lastActivityDate === today) return { streakDays: Math.max(1, currentStreak), newDay: false }
  if (lastActivityDate === previousDay(today))
    return { streakDays: currentStreak + 1, newDay: true }
  return { streakDays: 1, newDay: true }
}

/** A sequência só continua valendo se o último dia de estudo foi hoje ou ontem. */
export function liveStreak(
  lastActivityDate: string | null,
  streakDays: number,
  today: string,
): number {
  if (!lastActivityDate) return 0
  return lastActivityDate === today || lastActivityDate === previousDay(today) ? streakDays : 0
}

/** Início do mês corrente no horário de Brasília (o ranking do curso zera todo mês). */
export function brazilMonthStart(now: Date): Date {
  const [year, month] = brazilDate(now).split('-')
  // O Brasil não tem horário de verão desde 2019: o fuso é sempre -03:00.
  return new Date(`${year}-${month}-01T00:00:00-03:00`)
}

/** "Ana Beatriz Souza" → "Ana S.": o ranking mostra só o primeiro nome e a inicial. */
export function rankingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Aluno'
  const first = parts[0]!
  return parts.length > 1 ? `${first} ${parts.at(-1)![0]!.toUpperCase()}.` : first
}

export type LearnerStats = {
  lessonsCompleted: number
  coursesCompleted: number
  streakDays: number
  perfectQuizzes: number
  reviews: number
  questions: number
}

export type BadgeDefinition = {
  type: string
  name: string
  description: string
  /** Nome do ícone no front (lucide). */
  icon: 'footprints' | 'flame' | 'graduation' | 'trophy' | 'target' | 'star' | 'message' | 'zap'
  earned: (stats: LearnerStats) => boolean
}

export const BADGES: readonly BadgeDefinition[] = [
  {
    type: 'first_lesson',
    name: 'Primeiro passo',
    description: 'Concluir a primeira aula.',
    icon: 'footprints',
    earned: (s) => s.lessonsCompleted >= 1,
  },
  {
    type: 'lessons_10',
    name: 'Maratonista',
    description: 'Concluir 10 aulas.',
    icon: 'zap',
    earned: (s) => s.lessonsCompleted >= 10,
  },
  {
    type: 'lessons_50',
    name: 'Imparável',
    description: 'Concluir 50 aulas.',
    icon: 'zap',
    earned: (s) => s.lessonsCompleted >= 50,
  },
  {
    type: 'first_course',
    name: 'Formado',
    description: 'Concluir o primeiro curso.',
    icon: 'graduation',
    earned: (s) => s.coursesCompleted >= 1,
  },
  {
    type: 'courses_3',
    name: 'Colecionador de diplomas',
    description: 'Concluir 3 cursos.',
    icon: 'trophy',
    earned: (s) => s.coursesCompleted >= 3,
  },
  {
    type: 'perfect_quiz',
    name: 'Gabaritou',
    description: 'Acertar todas as perguntas de um quiz.',
    icon: 'target',
    earned: (s) => s.perfectQuizzes >= 1,
  },
  {
    type: 'streak_3',
    name: 'Pegando o ritmo',
    description: 'Estudar 3 dias seguidos.',
    icon: 'flame',
    earned: (s) => s.streakDays >= 3,
  },
  {
    type: 'streak_7',
    name: 'Uma semana firme',
    description: 'Estudar 7 dias seguidos.',
    icon: 'flame',
    earned: (s) => s.streakDays >= 7,
  },
  {
    type: 'streak_30',
    name: 'Hábito de ferro',
    description: 'Estudar 30 dias seguidos.',
    icon: 'flame',
    earned: (s) => s.streakDays >= 30,
  },
  {
    type: 'first_review',
    name: 'Crítico',
    description: 'Avaliar um curso concluído.',
    icon: 'star',
    earned: (s) => s.reviews >= 1,
  },
  {
    type: 'first_question',
    name: 'Curioso de plantão',
    description: 'Fazer a primeira pergunta num curso.',
    icon: 'message',
    earned: (s) => s.questions >= 1,
  },
]

/** Medalhas que as estatísticas já merecem e a pessoa ainda não tem. */
export function newlyEarnedBadges(
  stats: LearnerStats,
  owned: ReadonlySet<string>,
): BadgeDefinition[] {
  return BADGES.filter((badge) => !owned.has(badge.type) && badge.earned(stats))
}
