// =====================================================
// STUDENT PLAYER - TYPES
// =====================================================

type LessonType = 'video' | 'text' | 'quiz' | 'file'

export interface CourseModule {
  id: number
  title: string
  description: string | null
  displayOrder: number
  lessons: CourseLesson[]
}

export interface CourseLesson {
  id: number
  moduleId: number
  title: string
  description: string | null
  type: LessonType
  contentUrl: string | null
  contentText: string | null
  durationMinutes: number | null
  displayOrder: number
  isFreePreview: boolean

  // Progress data
  isCompleted: boolean
  watchTimeSeconds: number
  progressPercentage: number
}

export interface CoursePlayerData {
  courseId: number
  courseTitle: string
  courseSlug: string
  producerName: string
  producerAvatar: string | null
  thumbnailUrl: string | null
  modules: CourseModule[]
  totalLessons: number
  completedLessons: number
  progressPercentage: number
}

export interface LessonNote {
  id: string
  lessonId: number
  title: string
  content: string
  videoTimestamp: number | null
  createdAt: string
  updatedAt: string
}

export interface LessonQuestion {
  id: string
  lessonId: number | null
  question: string
  answer: string | null
  isPublic: boolean
  isMine: boolean
  authorName: string
  createdAt: string
  answeredAt: string | null
}

type QuizQuestionType = 'multiple_choice' | 'multiple_answer' | 'true_false'

interface LessonQuizOption {
  id: number
  optionText: string
  displayOrder: number
}

export interface LessonQuizQuestion {
  id: number
  type: QuizQuestionType
  questionText: string
  questionImageUrl?: string | null
  questionImageAlt?: string | null
  explanation: string | null
  points: number
  displayOrder: number
  options: LessonQuizOption[]
}

interface LessonQuizAttemptAnswer {
  questionId: number
  selectedOptionIds: number[]
}

interface LessonQuizAttemptFeedback {
  questionId: number
  isCorrect: boolean | null
  correctOptionIds: number[]
  explanation: string | null
}

interface LessonQuizAttempt {
  id: string
  attemptNumber: number
  scorePercentage: number
  scoredPoints: number
  totalPoints: number
  passed: boolean
  finalizedAt: string
  answers: LessonQuizAttemptAnswer[]
  feedback: LessonQuizAttemptFeedback[]
}

export interface LessonQuizData {
  lessonId: number
  approvalRequired: boolean
  passingScore: number
  allowRetake: boolean
  showAnswersAfter: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  timeLimitMinutes: number | null
  questions: LessonQuizQuestion[]
  latestAttempt: LessonQuizAttempt | null
  attemptsCount: number
}

export type LessonQuizLoadStatus =
  'ready' | 'access_denied' | 'not_configured' | 'no_valid_questions' | 'technical_error'

type LessonQuizLoadDetail =
  | 'enrollment_query_failed'
  | 'enrollment_missing'
  | 'lesson_query_failed'
  | 'lesson_missing'
  | 'lesson_course_mismatch'
  | 'settings_query_failed'
  | 'settings_missing'
  | 'questions_query_failed'
  | 'no_supported_questions'
  | 'options_query_failed'

export interface LessonQuizLoadResult {
  status: LessonQuizLoadStatus
  detail: LessonQuizLoadDetail | null
  quiz: LessonQuizData | null
}

export type PlayerTab = 'overview' | 'notes' | 'questions'

export interface CourseReviewByStudent {
  id: string
  rating: number
  title: string | null
  review: string | null
  response: string | null
}
