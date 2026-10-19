// =====================================================
// STUDENT QUESTIONS - QUESTION CARD
// =====================================================

import Link from 'next/link'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { BookOpen, CheckCircle2, Clock3, Eye, Globe2, Lock, PlayCircle } from 'lucide-react'
import type { StudentQuestion } from '../types'

interface QuestionCardProps {
  question: StudentQuestion
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function getPlayerHref(question: StudentQuestion) {
  if (!question.courseSlug) return null

  const params = new URLSearchParams()
  params.set('tab', 'questions')

  if (question.lessonId) {
    params.set('lesson', question.lessonId)
  }

  return `/student/courses/${question.courseSlug}/player?${params.toString()}`
}

export function QuestionCard({ question }: QuestionCardProps) {
  const createdAt = dateFormatter.format(new Date(question.createdAt))
  const answeredAt = question.answeredAt
    ? dateFormatter.format(new Date(question.answeredAt))
    : null
  const isAnswered = Boolean(question.answer)
  const playerHref = getPlayerHref(question)

  return (
    <Card>
      <CardHeader className="space-y-2 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold leading-tight sm:text-base">
              {question.courseTitle}
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {question.lessonTitle || 'Pergunta geral do curso'}
            </p>
          </div>

          <Badge variant={isAnswered ? 'default' : 'secondary'}>
            {isAnswered ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Respondida
              </>
            ) : (
              <>
                <Clock3 className="mr-1 h-3 w-3" />
                Pendente
              </>
            )}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {createdAt}
          </span>
          <span className="text-muted-foreground/60">•</span>
          <span className="inline-flex items-center gap-1">
            {question.isPublic ? <Globe2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {question.isPublic ? 'Pergunta pública' : 'Pergunta privada'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
        <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.question}</p>
        </div>

        {isAnswered && question.answer ? (
          <details className="group rounded-lg border bg-green-50/60 dark:bg-green-950/20">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-700 dark:text-green-400" />
                Visualizar resposta
              </span>
            </summary>
            <div className="space-y-2 border-t px-3 py-3" id={`answer-${question.id}`}>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Resposta do produtor
                {answeredAt ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {answeredAt}
                  </span>
                ) : null}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{question.answer}</p>
            </div>
          </details>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Aguardando resposta do produtor.
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t pt-3">
          {playerHref ? (
            <Button asChild size="sm" variant={isAnswered ? 'default' : 'outline'}>
              <Link href={playerHref}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {isAnswered ? 'Abrir aula e revisar' : 'Abrir aula'}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
