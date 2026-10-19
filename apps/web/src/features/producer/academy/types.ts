// =====================================================
// PRODUCER ACADEMY - TYPES
// =====================================================

type ContentType = 'video' | 'article' | 'quiz' | 'resource'
export type Category =
  'getting_started' | 'course_creation' | 'marketing' | 'sales' | 'analytics' | 'best_practices'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface AcademyContent {
  id: string
  title: string
  description?: string
  contentType: ContentType
  category: Category
  videoUrl?: string
  articleContent?: string
  thumbnailUrl?: string
  durationMinutes?: number
  difficulty: Difficulty
  orderIndex: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
  // Computed fields
  isCompleted?: boolean
  progress?: number
}

export interface AcademyStats {
  totalContent: number
  completedContent: number
  totalMinutes: number
  completedMinutes: number
  progressPercentage: number
}

export interface ProducerAcademy {
  stats: AcademyStats
  contents: AcademyContent[]
}

export type CategoryFilter = 'all' | Category
export type DifficultyFilter = 'all' | Difficulty
