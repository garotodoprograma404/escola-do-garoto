// =====================================================
// MY NOTES PAGE - SERVER COMPONENT
// =====================================================

import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { NotesStats } from '@/features/student/notes/components/NotesStats'
import { NotesFilters } from '@/features/student/notes/components/NotesFilters.client'
import { NoteCard } from '@/features/student/notes/components/NoteCard'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { getMyNotes, getNotesStats, getCoursesForFilter } from '@/features/student/notes'
import { FileText } from 'lucide-react'

interface MyNotesPageProps {
  searchParams: Promise<{
    course?: string
    search?: string
    sort?: 'recent' | 'oldest'
    page?: string
  }>
}

export const metadata = {
  title: 'Minhas Notas',
  description: 'Gerencie suas notas de estudo',
}

async function NotesContent({ searchParams }: MyNotesPageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) redirect('/login')

  const resolvedSearchParams = await searchParams
  const currentPage = Math.max(1, Number(resolvedSearchParams.page || '1') || 1)
  const currentSort = resolvedSearchParams.sort === 'oldest' ? 'oldest' : 'recent'
  const pageSize = 20

  const [notesResult, stats, courses] = await Promise.all([
    getMyNotes(authContext.userId, {
      courseId: resolvedSearchParams.course,
      search: resolvedSearchParams.search,
      sort: currentSort,
      page: currentPage,
      pageSize,
    }),
    getNotesStats(authContext.userId),
    getCoursesForFilter(authContext.userId),
  ])

  const notes = notesResult.notes
  const totalNotes = notesResult.total
  const totalPages = notesResult.totalPages
  const firstItem = totalNotes === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalNotes)

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams()

    if (resolvedSearchParams.course) params.set('course', resolvedSearchParams.course)
    if (resolvedSearchParams.search) params.set('search', resolvedSearchParams.search)
    if (currentSort !== 'recent') params.set('sort', currentSort)
    if (page > 1) params.set('page', String(page))

    const queryString = params.toString()
    return queryString ? `?${queryString}` : '/student/notes'
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Minhas Notas</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Organize e revise suas anotações de estudo
        </p>
      </div>

      {/* Stats */}
      <NotesStats stats={stats} />

      {/* Filters */}
      <NotesFilters courses={courses} />

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
        <p>
          {totalNotes === 0
            ? 'Nenhuma anotação encontrada'
            : `Mostrando ${firstItem}-${lastItem} de ${totalNotes} anotações`}
        </p>
        <p className="font-medium">
          Ordenação: {currentSort === 'oldest' ? 'Mais antigas' : 'Mais recentes'}
        </p>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center sm:p-12">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Nenhuma nota encontrada</h3>
          <p className="text-sm text-muted-foreground">
            {resolvedSearchParams.course || resolvedSearchParams.search
              ? 'Tente ajustar os filtros de busca'
              : 'Comece a criar notas durante suas aulas'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 border-t pt-4">
          {currentPage > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildPageHref(currentPage - 1)}>Página anterior</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Página anterior
            </Button>
          )}

          <p className="text-xs text-muted-foreground sm:text-sm">
            Página {currentPage} de {totalPages}
          </p>

          {currentPage < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildPageHref(currentPage + 1)}>Próxima página</Link>
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

export default function MyNotesPage(props: MyNotesPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      }
    >
      <NotesContent {...props} />
    </Suspense>
  )
}
