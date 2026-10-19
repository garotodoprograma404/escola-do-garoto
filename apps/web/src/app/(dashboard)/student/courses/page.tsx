// =====================================================
// STUDENT COURSES PAGE - SERVER COMPONENT
// =====================================================

import { redirect } from 'next/navigation'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import {
  calculateStudentCoursesStats,
  getStudentCourses,
  CourseList,
  StatsCards,
} from '@/features/student/courses'
import { measureOperation } from '@/shared/lib/observability'

export const metadata = {
  title: 'Meus Cursos',
  description: 'Visualize seus cursos matriculados e continue aprendendo',
}

export default async function StudentCoursesPage() {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }

  const courses = await measureOperation(
    'route.student.courses.list',
    () => getStudentCourses(authContext.userId),
    { route: '/student/courses' },
  )
  const stats = calculateStudentCoursesStats(courses)

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meus Cursos</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">
          Gerencie suas matrículas e continue de onde parou
        </p>
      </div>

      <StatsCards stats={stats} />
      <CourseList courses={courses} />
    </div>
  )
}
