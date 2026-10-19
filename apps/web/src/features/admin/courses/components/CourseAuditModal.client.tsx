'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Card, CardContent } from '@/shared/components/ui/card'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Archive,
  MessageSquareWarning,
  User,
  Tag,
  DollarSign,
  BookOpen,
  Calendar,
  Eye,
  ExternalLink,
  Star,
} from 'lucide-react'
import { ApproveDialog } from './ApproveDialog.client'
import { RejectDialog } from './RejectDialog.client'
import { MoveToDraftDialog } from './MoveToDraftDialog.client'
import { RequestChangesDialog } from './RequestChangesDialog.client'
import { ArchiveDialog } from './ArchiveDialog.client'
import { CourseStatusBadge } from './CourseStatusBadge'
import { AuditHistoryTimeline } from './AuditHistoryTimeline'
import { CourseContentView } from './CourseContentView'
import { EnrollStudentDialog } from './EnrollStudentDialog.client'
import type { AdminCourseListItem } from '../types'

interface CourseAuditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: AdminCourseListItem | null
  onSuccess?: () => void
  onEditCourse?: (course: AdminCourseListItem) => void
}

export function CourseAuditModal({
  open,
  onOpenChange,
  course,
  onSuccess,
  onEditCourse,
}: CourseAuditModalProps) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  if (!course) return null

  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  const handleEnrollmentSuccess = () => {
    onSuccess?.()
  }

  const handlePreview = () => {
    window.open(`/preview/courses/${course.id}`, '_blank')
  }

  const handleEdit = () => {
    onOpenChange(false)
    onEditCourse?.(course)
  }

  const isArchived = course.status === 'archived'
  const canApprove = course.status === 'pending'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-7xl flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="flex-1 text-2xl">{course.title}</DialogTitle>
              <Button variant="outline" size="sm" onClick={handlePreview} className="shrink-0">
                <Eye className="mr-2 h-4 w-4" />
                Ver como Aluno
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <ScrollArea className="mt-4 flex-1">
              <TabsContent value="info" className="pr-4">
                {/* 3-Column Layout: Metadata (3) | Content (6) | Actions (3) */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* COLUMN 1: Course Metadata (3 cols) */}
                  <div className="space-y-4 lg:col-span-3">
                    {/* Thumbnail */}
                    {course.thumbnail && (
                      <Card>
                        <CardContent className="p-0">
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            width={640}
                            height={360}
                            sizes="(max-width: 1024px) 100vw, 25vw"
                            className="h-40 w-full rounded-t-lg object-cover"
                          />
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick Stats */}
                    <Card>
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <CourseStatusBadge status={course.status} />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Produtor</p>
                              <p className="truncate text-sm font-medium">{course.producerName}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Categoria</p>
                              <p className="truncate text-sm font-medium">{course.category}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Preço</p>
                              <p className="text-sm font-medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(course.price)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Avaliação</p>
                              <p className="text-sm font-medium">
                                {course.rating > 0
                                  ? `⭐ ${course.rating.toFixed(1)}`
                                  : 'Sem avaliações'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Submetido</p>
                              <p className="text-sm font-medium">
                                {new Date(course.submittedAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Vendas</p>
                              <p className="text-sm font-medium">{course.salesCount} vendas</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Receita</p>
                              <p className="text-sm font-medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(course.revenue)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* COLUMN 2: Main Content (6 cols) */}
                  <div className="space-y-6 lg:col-span-6">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="mb-4 text-lg font-semibold">Descrição do Curso</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {course.title}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <h3 className="mb-4 text-lg font-semibold">Informações Detalhadas</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">ID do Curso</p>
                            <p className="font-mono text-sm">{course.id.slice(0, 8)}...</p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Última Atualização</p>
                            <p className="text-sm">
                              {new Date(course.updatedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* COLUMN 3: Actions Panel (3 cols) - Sticky */}
                  <div className="lg:col-span-3">
                    <div className="space-y-4 lg:sticky lg:top-4">
                      <Card>
                        <CardContent className="space-y-3 p-4">
                          <h3 className="text-sm font-semibold">Ações Rápidas</h3>
                          <Separator />
                          {canApprove ? (
                            <Button
                              onClick={() => setApproveOpen(true)}
                              className="w-full"
                              size="sm"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Aprovar
                            </Button>
                          ) : (
                            <p className="py-1 text-center text-xs text-muted-foreground">
                              Só cursos em análise podem ser aprovados.
                            </p>
                          )}
                          <Button
                            onClick={() => setDraftOpen(true)}
                            variant="outline"
                            className="w-full"
                            size="sm"
                          >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Mover para Rascunho
                          </Button>
                          {!isArchived && (
                            <>
                              <Button
                                onClick={() => setChangesOpen(true)}
                                variant="outline"
                                className="w-full"
                                size="sm"
                              >
                                <MessageSquareWarning className="mr-2 h-4 w-4" />
                                Pedir Alterações
                              </Button>
                              <Button
                                onClick={() => setRejectOpen(true)}
                                variant="destructive"
                                className="w-full"
                                size="sm"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Rejeitar
                              </Button>
                              <Button
                                onClick={() => setArchiveOpen(true)}
                                variant="outline"
                                className="w-full"
                                size="sm"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Arquivar
                              </Button>
                            </>
                          )}
                          <Button
                            onClick={handleEdit}
                            variant="secondary"
                            className="w-full"
                            size="sm"
                          >
                            Editar Curso
                          </Button>
                          <Separator />
                          <EnrollStudentDialog
                            courseId={course.id}
                            courseTitle={course.title}
                            onSuccess={handleEnrollmentSuccess}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-4 pr-4">
                <CourseContentView courseId={course.id} />
              </TabsContent>

              <TabsContent value="history" className="pr-4">
                <AuditHistoryTimeline courseId={course.id} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      {canApprove && (
        <ApproveDialog
          open={approveOpen}
          onOpenChange={setApproveOpen}
          courseId={course.id}
          courseTitle={course.title}
          onSuccess={handleSuccess}
        />
      )}
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        courseId={course.id}
        courseTitle={course.title}
        onSuccess={handleSuccess}
      />
      <RequestChangesDialog
        open={changesOpen}
        onOpenChange={setChangesOpen}
        courseId={course.id}
        courseTitle={course.title}
        onSuccess={handleSuccess}
      />
      <ArchiveDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        courseId={course.id}
        courseTitle={course.title}
        onSuccess={handleSuccess}
      />
      <MoveToDraftDialog
        open={draftOpen}
        onOpenChange={setDraftOpen}
        courseId={course.id}
        courseTitle={course.title}
        onSuccess={handleSuccess}
      />
    </>
  )
}
