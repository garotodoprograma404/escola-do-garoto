'use client'

import { Eye, Edit, Archive, MoreVertical, Star, TrendingUp } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { CourseStatusBadge } from './CourseStatusBadge'
import type { AdminCourseListItem } from '../types'
import { formatCurrency } from '@/shared/lib/utils'

interface CourseListTableProps {
  courses: AdminCourseListItem[]
  onView: (course: AdminCourseListItem) => void
  onEdit: (course: AdminCourseListItem) => void
  onArchive: (course: AdminCourseListItem) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function CourseListTable({ courses, onView, onEdit, onArchive }: CourseListTableProps) {
  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum curso encontrado com os filtros aplicados.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-950">
              <TableHead>Curso</TableHead>
              <TableHead>Produtor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Submetido</TableHead>
              <TableHead className="text-right">Performance</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow
                key={course.id}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                {/* Course Info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {course.title.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{course.title}</p>
                      {course.rating > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          <span>{course.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Producer */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-brand-500 text-xs text-white">
                        {course.producerName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {course.producerName}
                    </span>
                  </div>
                </TableCell>

                {/* Category */}
                <TableCell>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {course.category}
                  </span>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <CourseStatusBadge status={course.status} />
                </TableCell>

                {/* Price */}
                <TableCell>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {formatCurrency(course.price)}
                  </span>
                </TableCell>

                {/* Submitted Date */}
                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(course.submittedAt)}
                </TableCell>

                {/* Performance */}
                <TableCell className="text-right">
                  <div className="text-sm">
                    {course.salesCount > 0 ? (
                      <>
                        <p className="flex items-center justify-end gap-1 font-medium text-slate-900 dark:text-white">
                          <TrendingUp size={14} className="text-green-500" />
                          {course.salesCount} vendas
                        </p>
                        <p className="text-slate-600 dark:text-slate-400">
                          {formatCurrency(course.revenue)}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-400 dark:text-slate-500">Sem vendas</p>
                    )}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ações do curso ${course.title}`}
                      >
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(course)}>
                        <Eye size={16} className="mr-2" />
                        Visualizar e Decidir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(course)}>
                        <Edit size={16} className="mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {course.status !== 'archived' && (
                        <DropdownMenuItem
                          onClick={() => onArchive(course)}
                          className="text-red-600"
                        >
                          <Archive size={16} className="mr-2" />
                          Arquivar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
