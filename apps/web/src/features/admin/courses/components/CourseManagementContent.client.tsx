'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { CourseListTable } from './CourseListTable'
import { CourseAuditModal } from './CourseAuditModal.client'
import { ArchiveDialog } from './ArchiveDialog.client'
import { CoursePagination } from './CoursePagination.client'
import { getCoursesPaginatedAction } from '../actions/get-courses-paginated'
import { getCourseStatusCountsAction } from '../actions/get-course-status-counts'
import type { AdminCourseListItem, AdminCourseFilters } from '../types'
import { useToast } from '@/shared/hooks/use-toast'
import { Archive, Clock, FileText, CheckCircle2, XCircle, Search, X } from 'lucide-react'

type StatusTab = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'

const STATUS_MAP: Record<StatusTab, AdminCourseFilters['status']> = {
  draft: 'draft',
  pending: 'pending_review',
  approved: 'approved',
  rejected: 'rejected',
  archived: 'archived',
}

export function CourseManagementContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [statusTab, setStatusTab] = useState<StatusTab>('pending')
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<AdminCourseFilters>({
    searchTerm: '',
    status: 'pending_review',
    category: 'ALL',
  })
  const [courses, setCourses] = useState<AdminCourseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<AdminCourseListItem | null>(null)
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [courseToArchive, setCourseToArchive] = useState<AdminCourseListItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusCounts, setStatusCounts] = useState({
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const pageSize = 10

  useEffect(() => {
    setFilters((previous) => ({ ...previous, status: STATUS_MAP[statusTab] }))
    setCurrentPage(1)
  }, [statusTab])

  useEffect(() => {
    async function fetchCourses() {
      setLoading(true)
      try {
        const result = await getCoursesPaginatedAction(filters, currentPage, pageSize)
        setCourses(result.courses)
        setTotalItems(result.total)
        setTotalPages(result.totalPages)
      } catch (error) {
        console.error('Error fetching courses:', error)
        toast({
          title: 'Erro ao carregar cursos',
          description: 'Não foi possível carregar a lista de cursos.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [filters, currentPage, refreshKey, toast])

  useEffect(() => {
    async function fetchStatusCounts() {
      try {
        const counts = await getCourseStatusCountsAction()
        setStatusCounts(counts)
      } catch (error) {
        console.error('Error fetching status counts:', error)
      }
    }

    fetchStatusCounts()
  }, [refreshKey])

  const applySearch = () => {
    setFilters((previous) => ({ ...previous, searchTerm: searchInput.trim() }))
    setCurrentPage(1)
  }

  const clearSearch = () => {
    setSearchInput('')
    setFilters((previous) => ({ ...previous, searchTerm: '' }))
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleView = (course: AdminCourseListItem) => {
    setSelectedCourse(course)
    setAuditModalOpen(true)
  }

  const handleEdit = (course: AdminCourseListItem) => {
    router.push(`/admin/courses/${course.id}/edit`)
  }

  const handleAuditSuccess = () => {
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link href="/admin/courses/new">Novo Curso</Link>
        </Button>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <button
            onClick={() => setStatusTab('draft')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              statusTab === 'draft'
                ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" />
            Rascunhos
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {statusCounts.draft}
            </span>
          </button>
          <button
            onClick={() => setStatusTab('pending')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              statusTab === 'pending'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="h-4 w-4" />
            Pendentes
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900/50 dark:text-amber-300">
              {statusCounts.pending}
            </span>
          </button>
          <button
            onClick={() => setStatusTab('approved')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              statusTab === 'approved'
                ? 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-400'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprovados
            <span className="rounded-full bg-green-200 px-2 py-0.5 text-xs text-green-900 dark:bg-green-900/50 dark:text-green-300">
              {statusCounts.approved}
            </span>
          </button>
          <button
            onClick={() => setStatusTab('rejected')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              statusTab === 'rejected'
                ? 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-400'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <XCircle className="h-4 w-4" />
            Rejeitados
            <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs text-red-900 dark:bg-red-900/50 dark:text-red-300">
              {statusCounts.rejected}
            </span>
          </button>
          <button
            onClick={() => setStatusTab('archived')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              statusTab === 'archived'
                ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Archive className="h-4 w-4" />
            Arquivados
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {statusCounts.archived}
            </span>
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400"
              size={16}
            />
            <Input
              className="pl-9 pr-9"
              placeholder="Buscar por título ou produtor"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  applySearch()
                }
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 dark:text-slate-400"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={applySearch}>
            Buscar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-20 rounded bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <CourseListTable
            courses={courses}
            onView={handleView}
            onEdit={handleEdit}
            onArchive={setCourseToArchive}
          />
          <CoursePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </>
      )}

      <CourseAuditModal
        open={auditModalOpen}
        onOpenChange={setAuditModalOpen}
        course={selectedCourse}
        onSuccess={handleAuditSuccess}
        onEditCourse={handleEdit}
      />

      {courseToArchive && (
        <ArchiveDialog
          open
          onOpenChange={(open) => !open && setCourseToArchive(null)}
          courseId={courseToArchive.id}
          courseTitle={courseToArchive.title}
          onSuccess={handleAuditSuccess}
        />
      )}
    </div>
  )
}
