// =====================================================
// COURSE PLAYER LAYOUT - CLIENT COMPONENT
// =====================================================

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, FileText, Menu } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/shared/components/ui/sheet'
import { Card } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'
import { cn } from '@/shared/lib/utils'
import { VideoPlayer } from './VideoPlayer.client'
import { CurriculumSidebar } from './CurriculumSidebar.client'
import { PlayerTabs } from './PlayerTabs.client'
import { CourseCompletionCard } from './CourseCompletionCard.client'
import { QuizLesson } from './QuizStepLesson.client'
import { markCompleteAction } from '../actions/mark-complete'
import { useToast } from '@/shared/hooks/use-toast'
import type { CoursePlayerData, CourseLesson, LessonQuizLoadResult, PlayerTab } from '../types'

interface CoursePlayerLayoutProps {
  data: CoursePlayerData
  initialLesson: CourseLesson
  initialQuizState: LessonQuizLoadResult | null
  initialTab: PlayerTab
  highlightedNoteId?: string
}

function resolveLessonWithLocalProgress(
  lesson: CourseLesson,
  completedLessonIds: Set<number>,
): CourseLesson {
  if (lesson.isCompleted || !completedLessonIds.has(lesson.id)) {
    return lesson
  }

  return {
    ...lesson,
    isCompleted: true,
    progressPercentage: 100,
  }
}

export function CoursePlayerLayout({
  data,
  initialLesson,
  initialQuizState,
  initialTab,
  highlightedNoteId,
}: CoursePlayerLayoutProps) {
  const router = useRouter()
  const { toast } = useToast()
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const [currentLesson, setCurrentLesson] = useState(initialLesson)
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTheaterMode, setIsTheaterMode] = useState(false)
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<number>>(() => {
    const initialCompletedLessons = new Set<number>()
    for (const moduleItem of data.modules) {
      for (const lesson of moduleItem.lessons) {
        if (lesson.isCompleted) {
          initialCompletedLessons.add(lesson.id)
        }
      }
    }
    return initialCompletedLessons
  })
  // Sync contract:
  // - Local-only sync: completion flags, sidebar counters, mark-complete buttons, auto-advance.
  // - Server sync by lesson navigation (`router.replace` with `?lesson=`): quiz payload for selected lesson.
  // - Server sync on-demand in child tabs: notes/questions actions.
  const activeLesson = useMemo(
    () => resolveLessonWithLocalProgress(currentLesson, completedLessonIds),
    [completedLessonIds, currentLesson],
  )
  const isLessonSynced = activeLesson.id === initialLesson.id
  const quizState = isLessonSynced ? initialQuizState : null
  const activeInitialTab: PlayerTab = isLessonSynced ? initialTab : 'overview'
  const activeHighlightedNoteId = isLessonSynced ? highlightedNoteId : undefined
  const isCurrentLessonCompleted = activeLesson.isCompleted

  const modulesWithLocalProgress = useMemo(() => {
    return data.modules.map((moduleItem) => ({
      ...moduleItem,
      lessons: moduleItem.lessons.map((lesson) => {
        return resolveLessonWithLocalProgress(lesson, completedLessonIds)
      }),
    }))
  }, [completedLessonIds, data.modules])
  const allLessons = useMemo(
    () => modulesWithLocalProgress.flatMap((moduleItem) => moduleItem.lessons),
    [modulesWithLocalProgress],
  )

  const completedLessonsCount = allLessons.filter((lesson) => lesson.isCompleted).length
  const progressPercentage =
    allLessons.length === 0 ? 0 : Math.round((completedLessonsCount / allLessons.length) * 100)
  const isCourseCompleted = allLessons.length > 0 && completedLessonsCount === allLessons.length

  const markLessonCompletedLocally = useCallback((lessonId: number) => {
    setCompletedLessonIds((prev) => {
      if (prev.has(lessonId)) {
        return prev
      }
      const next = new Set(prev)
      next.add(lessonId)
      return next
    })

    setCurrentLesson((prev) => {
      if (prev.id !== lessonId || prev.isCompleted) {
        return prev
      }

      return {
        ...prev,
        isCompleted: true,
        progressPercentage: 100,
      }
    })
  }, [])

  useEffect(() => {
    setCurrentLesson(initialLesson)
    setCurrentVideoTime(0)
    if (initialLesson.isCompleted) {
      setCompletedLessonIds((prev) => {
        if (prev.has(initialLesson.id)) return prev
        const next = new Set(prev)
        next.add(initialLesson.id)
        return next
      })
    }
  }, [initialLesson])

  const handleLessonSelect = (lesson: CourseLesson) => {
    setCurrentLesson(lesson)
    setCurrentVideoTime(0)
    setIsSidebarOpen(false)
    router.replace(`/student/courses/${data.courseSlug}/player?lesson=${lesson.id}`)
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleMarkComplete = async () => {
    if (isCurrentLessonCompleted || isMarkingComplete) {
      return
    }

    const completedLessonId = activeLesson.id
    const currentIndex = allLessons.findIndex((lesson) => lesson.id === completedLessonId)
    const nextLesson =
      currentIndex >= 0 && currentIndex < allLessons.length - 1
        ? allLessons[currentIndex + 1]
        : null

    setIsMarkingComplete(true)
    try {
      const result = await markCompleteAction(completedLessonId)
      if (result.success) {
        markLessonCompletedLocally(completedLessonId)
        toast({ title: 'Conteúdo marcado como concluído!' })

        if (nextLesson) {
          setTimeout(() => {
            setCurrentLesson(nextLesson)
            router.replace(`/student/courses/${data.courseSlug}/player?lesson=${nextLesson.id}`)
          }, 1000)
        }
        return
      }

      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    } finally {
      setIsMarkingComplete(false)
    }
  }

  const handleVideoComplete = () => {
    if (!isCurrentLessonCompleted && !isMarkingComplete) {
      handleMarkComplete()
    }
  }

  return (
    <div className="flex h-[calc(100dvh-var(--demo-bar,0px))] min-h-[calc(100vh-var(--demo-bar,0px))] flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-card px-2 py-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/student')}
            className="shrink-0"
            aria-label="Voltar para o painel"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="hidden min-w-0 md:block">
            <h1 className="truncate font-semibold">{data.courseTitle}</h1>
            <p className="truncate text-sm text-muted-foreground">{activeLesson.title}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <Progress
              value={progressPercentage}
              className="h-2 w-24"
              aria-label="Progresso do curso"
            />
            <span className="whitespace-nowrap text-sm font-medium">
              {progressPercentage}% concluído
            </span>
          </div>

          {!isCurrentLessonCompleted && (
            <Button
              onClick={handleMarkComplete}
              size="sm"
              className="hidden sm:flex"
              disabled={isMarkingComplete}
            >
              <Check className="mr-2 h-4 w-4" />
              Marcar como Concluído
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTheaterMode((prev) => !prev)}
            className="hidden lg:inline-flex"
          >
            {isTheaterMode ? 'Mostrar Conteúdo' : 'Modo Foco'}
          </Button>

          {/* Mobile: Icon only button */}
          {!isCurrentLessonCompleted && (
            <Button
              onClick={handleMarkComplete}
              size="icon"
              variant="default"
              className="sm:hidden"
              disabled={isMarkingComplete}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full p-0 sm:max-w-md">
              <SheetTitle className="sr-only">Conteúdo do Curso</SheetTitle>
              <CurriculumSidebar
                modules={modulesWithLocalProgress}
                currentLessonId={activeLesson.id}
                onLessonSelect={handleLessonSelect}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Video + Tabs Area */}
        <div
          ref={contentScrollRef}
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        >
          <div className="w-full p-2 sm:p-4 lg:p-6 xl:px-8">
            {activeLesson.type === 'video' && activeLesson.contentUrl && (
              <div className="-mx-2 sm:mx-0">
                <VideoPlayer
                  key={`lesson-video-${activeLesson.id}`}
                  url={activeLesson.contentUrl}
                  lessonId={activeLesson.id}
                  initialProgress={activeLesson.watchTimeSeconds}
                  onProgress={setCurrentVideoTime}
                  onComplete={handleVideoComplete}
                />
              </div>
            )}

            {activeLesson.type === 'quiz' && (
              <>
                {!isLessonSynced ? (
                  <Card className="flex aspect-video items-center justify-center p-6 text-center">
                    <p className="text-sm text-muted-foreground">Carregando dados do quiz...</p>
                  </Card>
                ) : (
                  <QuizLesson
                    lessonId={activeLesson.id}
                    lessonTitle={activeLesson.title}
                    quizState={quizState}
                    isCompleted={isCurrentLessonCompleted}
                    onPassed={() => markLessonCompletedLocally(activeLesson.id)}
                  />
                )}
              </>
            )}

            {activeLesson.type === 'text' && (
              <Card className="p-6">
                {activeLesson.contentText ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: activeLesson.contentText }}
                  />
                ) : (
                  <p className="text-muted-foreground">Esta aula não possui conteúdo em texto.</p>
                )}
              </Card>
            )}

            {activeLesson.type === 'file' && (
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-3">
                    <h3 className="font-semibold">Material da aula</h3>
                    <p className="text-sm text-muted-foreground">
                      Baixe o arquivo disponibilizado pelo produtor.
                    </p>
                    {activeLesson.contentUrl ? (
                      <Button asChild>
                        <Link
                          href={activeLesson.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir arquivo
                        </Link>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum arquivo disponível para esta aula.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {activeLesson.type === 'video' && !activeLesson.contentUrl && (
              <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
                <p className="text-muted-foreground">URL de vídeo não disponível para esta aula.</p>
              </div>
            )}

            {/* Lesson Title (Mobile) */}
            <div className="mt-4 md:hidden">
              <h2 className="text-xl font-bold">{activeLesson.title}</h2>
            </div>

            {isCourseCompleted && (
              <div className="mt-5">
                <CourseCompletionCard courseId={data.courseId} courseTitle={data.courseTitle} />
              </div>
            )}

            {/* Tabs */}
            <div className="mt-5 sm:mt-6">
              <PlayerTabs
                key={activeLesson.id}
                lesson={activeLesson}
                courseId={data.courseId}
                currentVideoTime={currentVideoTime}
                initialTab={activeInitialTab}
                highlightedNoteId={activeHighlightedNoteId}
              />
            </div>
          </div>
        </div>

        {/* Sidebar (Desktop) */}
        <aside
          className={cn(
            'hidden shrink-0 lg:block',
            isTheaterMode ? 'lg:hidden' : 'w-[24rem] xl:w-[28rem]',
          )}
        >
          <CurriculumSidebar
            modules={modulesWithLocalProgress}
            currentLessonId={activeLesson.id}
            onLessonSelect={handleLessonSelect}
          />
        </aside>
      </div>
    </div>
  )
}
