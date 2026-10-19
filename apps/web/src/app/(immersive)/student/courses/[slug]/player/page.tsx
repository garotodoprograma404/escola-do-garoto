// =====================================================
// STUDENT COURSE PLAYER PAGE - SERVER COMPONENT
// =====================================================

import { redirect } from 'next/navigation'
import { getCoursePlayerData, getLessonQuizData } from '@/features/student/player'
import { CoursePlayerLayout } from '@/features/student/player/components/CoursePlayerLayout.client'
import type { PlayerTab } from '@/features/student/player'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { measureOperation } from '@/shared/lib/observability'

interface PlayerPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    lesson?: string
    tab?: string
    note?: string
  }>
}

export async function generateMetadata({ params }: PlayerPageProps) {
  await params
  return {
    title: `Assistir Curso`,
    description: 'Assista às aulas do curso',
  }
}

export default async function PlayerPage({ params, searchParams }: PlayerPageProps) {
  const { slug } = await params
  const { lesson: lessonIdParam, tab: tabParam, note: noteParam } = await searchParams

  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  // Get course data with progress
  const data = await measureOperation(
    'route.student.player.course',
    () => getCoursePlayerData(authContext.userId, slug),
    {
      route: `/student/courses/${slug}/player`,
      hasLessonParam: Boolean(lessonIdParam),
    },
  )

  if (!data) {
    redirect('/student')
  }

  // Determine which lesson to show
  let currentLesson = data.modules[0]?.lessons[0]

  if (lessonIdParam) {
    // Find specific lesson
    const lessonId = parseInt(lessonIdParam, 10)
    for (const courseModule of data.modules) {
      const found = courseModule.lessons.find((l) => l.id === lessonId)
      if (found) {
        currentLesson = found
        break
      }
    }
  } else {
    // Find last accessed or first incomplete lesson
    for (const courseModule of data.modules) {
      const incomplete = courseModule.lessons.find((l) => !l.isCompleted)
      if (incomplete) {
        currentLesson = incomplete
        break
      }
    }
  }

  if (!currentLesson) {
    redirect('/student')
  }

  const initialTab: PlayerTab =
    tabParam === 'notes' || tabParam === 'questions' || tabParam === 'overview'
      ? tabParam
      : 'overview'
  const highlightedNoteId =
    typeof noteParam === 'string' && noteParam.length > 0 ? noteParam : undefined

  const quiz =
    currentLesson.type === 'quiz'
      ? await measureOperation(
          'route.student.player.quiz',
          () => getLessonQuizData(authContext.userId, data.courseId, currentLesson.id),
          {
            route: `/student/courses/${slug}/player`,
            lessonId: currentLesson.id,
            courseId: data.courseId,
          },
        )
      : null

  return (
    <CoursePlayerLayout
      data={data}
      initialLesson={currentLesson}
      initialQuizState={quiz}
      initialTab={initialTab}
      highlightedNoteId={highlightedNoteId}
    />
  )
}
