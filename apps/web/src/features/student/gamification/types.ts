/** Formatos da API de gamificação (`GET /api/student/gamification` e ranking). */
export type BadgeIcon =
  'footprints' | 'flame' | 'graduation' | 'trophy' | 'target' | 'star' | 'message' | 'zap'

export type XpSource =
  | 'lesson_completed'
  | 'quiz_passed'
  | 'quiz_perfect'
  | 'course_completed'
  | 'review'
  | 'question'
  | 'streak_day'

export interface GamificationBadge {
  type: string
  name: string
  description: string
  icon: BadgeIcon
  earnedAt: string | null
}

export interface GamificationSummary {
  xp: number
  level: number
  levelName: string
  currentLevelXp: number
  nextLevelXp: number
  levelProgress: number
  streakDays: number
  rankingVisible: boolean
  badges: GamificationBadge[]
  recentEvents: {
    source: XpSource
    points: number
    courseTitle: string | null
    createdAt: string
  }[]
}

export interface CourseRanking {
  courseId: number
  month: string
  entries: { position: number; name: string; points: number; isMe: boolean }[]
  me: { points: number; position: number } | null
}
