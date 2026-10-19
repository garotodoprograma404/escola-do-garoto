// =====================================================
// PRODUCER Q&A - QUESTIONS LIST (Server Component)
// =====================================================

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, ThumbsUp, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import type { Question } from '../types'
import { AnswerButton } from './AnswerButton.client'

interface QuestionsListProps {
  questions: Question[]
}

export function QuestionsList({ questions }: QuestionsListProps) {
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Nenhuma pergunta encontrada</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => {
        const isAnswered = !!question.answer
        const createdDate = format(new Date(question.createdAt), "dd 'de' MMMM 'às' HH:mm", {
          locale: ptBR,
        })

        return (
          <Card key={question.id}>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={question.studentAvatar} />
                      <AvatarFallback>
                        {question.studentName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{question.studentName}</p>
                        <Badge variant={isAnswered ? 'default' : 'secondary'}>
                          {isAnswered ? (
                            <>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Respondida
                            </>
                          ) : (
                            <>
                              <Clock className="mr-1 h-3 w-3" />
                              Pendente
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{question.courseTitle}</span>
                        {question.lessonTitle && (
                          <>
                            <span>•</span>
                            <span>{question.lessonTitle}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{createdDate}</span>
                      </div>
                    </div>
                  </div>
                  {!isAnswered && (
                    <AnswerButton
                      questionId={question.id}
                      questionText={question.question}
                      studentName={question.studentName}
                    />
                  )}
                </div>

                {/* Question */}
                <div className="pl-13">
                  <p className="text-slate-700 dark:text-slate-300">{question.question}</p>
                </div>

                {/* Answer */}
                {isAnswered && question.answer && (
                  <div className="pl-13 border-t pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Sua Resposta</span>
                      {question.answeredAt && (
                        <span className="text-xs text-muted-foreground">
                          •{' '}
                          {format(new Date(question.answeredAt), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                    <p className="rounded-lg bg-green-50 p-3 text-sm text-slate-600 dark:bg-green-950/20 dark:text-slate-400">
                      {question.answer}
                    </p>
                  </div>
                )}

                {/* Footer */}
                {question.upvotes > 0 && (
                  <div className="pl-13 flex items-center gap-2 text-sm text-muted-foreground">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{question.upvotes} curtidas</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
