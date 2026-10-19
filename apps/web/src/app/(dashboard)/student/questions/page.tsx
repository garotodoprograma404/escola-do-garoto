// =====================================================
// STUDENT QUESTIONS PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageCircle, PlusCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  getStudentQuestionCourses,
  getStudentQuestions,
  QuestionCard,
  QuestionsFilters,
  QuestionsStats,
} from '@/features/student/questions'
import type { QuestionStatusFilter } from '@/features/student/questions'

interface StudentQuestionsPageProps {
  searchParams: Promise<{
    course?: string
    search?: string
    status?: string
    page?: string
  }>
}

export const metadata = {
  title: 'Perguntas',
  description: 'Acompanhe suas dúvidas e respostas dos cursos',
}

function normalizeStatus(status?: string): QuestionStatusFilter {
  if (status === 'pending' || status === 'answered') {
    return status
  }

  return 'all'
}

async function StudentQuestionsContent({ searchParams }: StudentQuestionsPageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) redirect('/login')

  const params = await searchParams
  const page = Math.max(1, Number(params.page || '1') || 1)
  const pageSize = 20
  const status = normalizeStatus(params.status)
  const courseId = params.course && /^\d+$/.test(params.course) ? params.course : undefined

  const [questionsResult, courses] = await Promise.all([
    getStudentQuestions(authContext.userId, {
      courseId,
      search: params.search,
      status,
      page,
      pageSize,
    }),
    getStudentQuestionCourses(authContext.userId),
  ])

  const totalQuestions = questionsResult.total
  const totalPages = questionsResult.totalPages
  const firstItem = totalQuestions === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalQuestions)

  const buildPageHref = (targetPage: number) => {
    const queryParams = new URLSearchParams()

    if (courseId) queryParams.set('course', courseId)
    if (params.search) queryParams.set('search', params.search)
    if (status !== 'all') queryParams.set('status', status)
    if (targetPage > 1) queryParams.set('page', String(targetPage))

    const queryString = queryParams.toString()
    return queryString ? `?${queryString}` : '/student/questions'
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Minhas Perguntas</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Acompanhe suas dúvidas e visualize as respostas do produtor
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/student/courses">
            <PlusCircle className="mr-2 h-4 w-4" />
            Fazer nova pergunta
          </Link>
        </Button>
      </div>

      <QuestionsStats stats={questionsResult.stats} />

      <QuestionsFilters courses={courses} />

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p>
          {totalQuestions === 0
            ? 'Nenhuma pergunta encontrada'
            : `Mostrando ${firstItem}-${lastItem} de ${totalQuestions} perguntas`}
        </p>
        <p className="font-medium">
          Status: {status === 'all' ? 'Todas' : status === 'answered' ? 'Respondidas' : 'Pendentes'}
        </p>
      </div>

      {questionsResult.questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center sm:p-12">
          <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Nenhuma pergunta encontrada</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {params.search || courseId || status !== 'all'
              ? 'Ajuste os filtros para encontrar suas perguntas.'
              : 'Faça perguntas dentro das aulas para acompanhar as respostas aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {questionsResult.questions.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildPageHref(page - 1)}>Página anterior</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Página anterior
            </Button>
          )}

          <p className="text-xs text-muted-foreground sm:text-sm">
            Página {page} de {totalPages}
          </p>

          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildPageHref(page + 1)}>Próxima página</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Próxima página
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function StudentQuestionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-5 w-64 sm:w-96" />
        </div>
        <Skeleton className="h-10 w-full sm:w-44" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-12 w-full" />

      <div className="grid gap-4">
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} className="h-64" />
        ))}
      </div>
    </div>
  )
}

export default function StudentQuestionsPage(props: StudentQuestionsPageProps) {
  return (
    <Suspense fallback={<StudentQuestionsSkeleton />}>
      <StudentQuestionsContent {...props} />
    </Suspense>
  )
}
