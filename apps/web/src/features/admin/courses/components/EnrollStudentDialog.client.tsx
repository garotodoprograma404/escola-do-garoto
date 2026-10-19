'use client'

import { useMemo, useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useToast } from '@/shared/hooks/use-toast'
import { getRoleUsersAction, type CourseRoleUserOption } from '../actions/get-role-users'
import { enrollStudentInCourseAction } from '../actions/enroll-student'

interface EnrollStudentDialogProps {
  courseId: string
  courseTitle: string
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function EnrollStudentDialog({
  courseId,
  courseTitle,
  onSuccess,
  open,
  onOpenChange,
  hideTrigger = false,
}: EnrollStudentDialogProps) {
  const { toast } = useToast()
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<CourseRoleUserOption[]>([])
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState('')

  const dialogOpen = typeof open === 'boolean' ? open : internalOpen

  const setDialogOpen = (nextOpen: boolean) => {
    if (typeof open === 'boolean') {
      onOpenChange?.(nextOpen)
      return
    }

    setInternalOpen(nextOpen)
  }

  async function handleDialogOpenChange(nextOpen: boolean) {
    setDialogOpen(nextOpen)
    if (!nextOpen) return

    if (students.length > 0) return

    setIsLoadingStudents(true)
    try {
      const result = await getRoleUsersAction('student')
      if (result.success && result.data) {
        setStudents(result.data)
      } else {
        toast({
          title: 'Erro ao carregar alunos',
          description: result.error || 'Não foi possível carregar os alunos.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao carregar alunos',
        description: 'Não foi possível carregar os alunos.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students
    const searchTerm = search.toLowerCase()
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(searchTerm) ||
        student.email.toLowerCase().includes(searchTerm),
    )
  }, [students, search])

  async function handleEnroll() {
    if (!studentId) {
      toast({
        title: 'Selecione um aluno',
        description: 'Escolha um aluno para matricular no curso.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await enrollStudentInCourseAction({
        courseId,
        studentId,
      })

      if (result.success) {
        toast({
          title: 'Aluno matriculado',
          description: 'A matrícula foi realizada com sucesso.',
        })
        setDialogOpen(false)
        setStudentId('')
        setSearch('')
        onSuccess?.()
      } else {
        toast({
          title: 'Erro na matrícula',
          description: result.error || 'Não foi possível matricular o aluno.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro na matrícula',
        description: 'Não foi possível matricular o aluno.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Matricular Aluno
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Matricular Aluno</DialogTitle>
          <DialogDescription>
            Matricular aluno manualmente no curso <strong>{courseTitle}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="studentSearch">Buscar aluno</Label>
            <Input
              id="studentSearch"
              placeholder="Digite nome ou email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={isLoadingStudents || isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentId">Aluno</Label>
            <Select
              value={studentId || undefined}
              onValueChange={setStudentId}
              disabled={isLoadingStudents || isSubmitting}
            >
              <SelectTrigger id="studentId">
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} {student.email ? `(${student.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingStudents && (
              <p className="text-xs text-muted-foreground">Carregando alunos...</p>
            )}
            {!isLoadingStudents && filteredStudents.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum aluno encontrado.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleEnroll}
              disabled={isSubmitting || isLoadingStudents}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Matriculando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Confirmar Matrícula
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
