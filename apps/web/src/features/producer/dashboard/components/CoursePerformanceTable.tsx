import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Progress } from '@/shared/components/ui/progress'
import { Star, Users, DollarSign, TrendingUp } from 'lucide-react'
import type { CoursePerformance } from '../types'

interface CoursePerformanceTableProps {
  courses: CoursePerformance[]
}

export function CoursePerformanceTable({ courses }: CoursePerformanceTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const courseLabel = courses.length === 1 ? 'curso' : 'cursos'

  if (!courses || courses.length === 0) {
    return (
      <Card>
        <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
          <CardTitle className="text-xl">Performance dos Cursos</CardTitle>
          <CardDescription>Top 5 cursos por número de alunos</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
          <div className="flex min-h-[140px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground sm:min-h-[180px] sm:text-base">
            Nenhum curso publicado ainda
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <CardTitle className="text-xl">Performance dos Cursos</CardTitle>
        <CardDescription>
          Top {courses.length} {courseLabel} por número de alunos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:space-y-4 sm:px-6 sm:pb-6">
        {courses.map((course) => (
          <div key={course.id} className="rounded-lg border p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="line-clamp-2 text-sm font-semibold leading-tight sm:text-base">
                {course.title}
              </p>
              <Badge variant="secondary" className="shrink-0">
                <Users className="mr-1 h-3 w-3" />
                {course.students}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 text-xs min-[520px]:grid-cols-3 sm:text-sm">
              <div className="rounded-md bg-muted/40 px-2.5 py-2">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                  <DollarSign className="h-3 w-3" />
                  Receita
                </p>
                <p className="font-semibold">{formatCurrency(course.revenue)}</p>
              </div>

              <div className="rounded-md bg-muted/40 px-2.5 py-2">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                  <Star className="h-3 w-3" />
                  Avaliação
                </p>
                <p className="font-semibold">{course.rating ? course.rating.toFixed(1) : 'N/A'}</p>
              </div>

              <div className="rounded-md bg-muted/40 px-2.5 py-2">
                <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                  <TrendingUp className="h-3 w-3" />
                  Conclusão
                </p>
                <p className="font-semibold">{course.completionRate}%</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground sm:text-xs">
                <span>Progresso de conclusão</span>
                <span>{course.completionRate}%</span>
              </div>
              <Progress value={course.completionRate} className="h-1.5" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
