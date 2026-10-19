'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getCourseAuditsAction } from '../actions/get-course-audits'

interface AuditHistoryTimelineProps {
  courseId: string
}

interface Audit {
  id: number
  course_id: number
  auditor_id: string
  decision: 'approved' | 'rejected' | 'changes_requested'
  feedback: string | null
  changes_requested: string[] | null
  created_at: string
}

export function AuditHistoryTimeline({ courseId }: AuditHistoryTimelineProps) {
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAudits() {
      setLoading(true)
      setError(null)

      try {
        const result = await getCourseAuditsAction(courseId)

        if (result.success) {
          setAudits(result.data as Audit[])
        } else {
          setError(result.error || 'Erro ao carregar histórico')
        }
      } catch (err) {
        console.error('❌ Error loading audits:', err)
        setError('Erro ao carregar histórico')
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      loadAudits()
    }
  }, [courseId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-500" />
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (audits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Nenhuma auditoria registrada ainda.</p>
        <p className="mt-2 text-xs text-muted-foreground">Course ID: {courseId}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {audits.map((audit, index) => (
        <div key={audit.id} className="relative">
          {/* Timeline line */}
          {index < audits.length - 1 && (
            <div className="absolute bottom-[-24px] left-[15px] top-[40px] w-[2px] bg-border" />
          )}

          <div className="flex gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              {audit.decision === 'approved' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <CheckCircle2 className="h-5 w-5 text-green-700 dark:text-green-400" />
                </div>
              )}
              {audit.decision === 'rejected' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                  <XCircle className="h-5 w-5 text-red-700 dark:text-red-400" />
                </div>
              )}
              {audit.decision === 'changes_requested' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                  <AlertCircle className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    audit.decision === 'approved'
                      ? 'default'
                      : audit.decision === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {audit.decision === 'approved' && 'Aprovado'}
                  {audit.decision === 'rejected' && 'Rejeitado'}
                  {audit.decision === 'changes_requested' && 'Mudanças Solicitadas'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(audit.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {audit.feedback && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">{audit.feedback}</p>
                </div>
              )}

              {audit.changes_requested && audit.changes_requested.length > 0 && (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">Mudanças solicitadas:</p>
                  <ul className="list-inside list-disc space-y-1">
                    {audit.changes_requested.map((change, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {formatChangeLabel(change)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatChangeLabel(changeId: string): string {
  const labels: Record<string, string> = {
    video_quality: 'Melhorar qualidade de vídeo',
    audio_quality: 'Melhorar qualidade de áudio',
    content: 'Ajustar conteúdo programático',
    resources: 'Adicionar recursos/materiais',
    copyright: 'Revisar questões de copyright',
    pricing: 'Ajustar precificação',
    description: 'Melhorar descrição do curso',
    thumbnail: 'Melhorar thumbnail/capa',
    other: 'Outros',
  }

  return labels[changeId] || changeId
}
