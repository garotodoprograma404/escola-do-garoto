// =====================================================
// PRODUCER ANALYTICS - COURSE PERFORMANCE TABLE (Server Component)
// =====================================================

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import type { CoursePerformance } from '../types'
import { BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/shared/lib/utils'

interface CoursePerformanceTableProps {
  data: CoursePerformance[]
}

export function CoursePerformanceTable({ data }: CoursePerformanceTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Curso</CardTitle>
          <CardDescription>
            Alunos, conclusão e avaliação hoje; receita no período escolhido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">Sem dados para exibir</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-600" />
          Performance por Curso
        </CardTitle>
        <CardDescription>
          Alunos, conclusão e avaliação hoje; receita no período escolhido
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
                <TableHead className="text-center">Ativos</TableHead>
                <TableHead className="text-right">Receita no período</TableHead>
                <TableHead className="text-center">Avaliação</TableHead>
                <TableHead className="text-center">Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((course) => (
                <TableRow key={course.courseId}>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {course.courseTitle}
                  </TableCell>
                  <TableCell className="text-center">{course.students}</TableCell>
                  <TableCell className="text-center">{course.activeStudents}</TableCell>
                  <TableCell className="text-right">{formatCurrency(course.revenue)}</TableCell>
                  <TableCell className="text-center">
                    {course.rating > 0 ? `${course.rating.toFixed(1)} ⭐` : '-'}
                  </TableCell>
                  <TableCell className="text-center">{course.completionRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
