// =====================================================
// QUESTIONS TAB - CLIENT COMPONENT
// =====================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { askQuestionAction, getLessonQuestionsAction } from '../actions/question-actions'
import { useToast } from '@/shared/hooks/use-toast'
import type { LessonQuestion } from '../types'

interface QuestionsTabProps {
  courseId: number
  lessonId: number
  isActive: boolean
}

export function QuestionsTab({ courseId, lessonId, isActive }: QuestionsTabProps) {
  const [questionText, setQuestionText] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [questions, setQuestions] = useState<LessonQuestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const { toast } = useToast()
  const loadedLessonIdRef = useRef<number | null>(null)

  const loadQuestions = useCallback(
    async (options?: { append?: boolean; offset?: number }) => {
      const append = options?.append ?? false
      const offset = options?.offset ?? 0
      setLoadError(null)

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      const result = await getLessonQuestionsAction({
        courseId,
        lessonId,
        offset,
        limit: 20,
      })

      if (!result.success || !result.data) {
        setLoadError(result.error || 'Não foi possível carregar as perguntas')
        setIsLoading(false)
        setIsLoadingMore(false)
        return
      }

      setQuestions((prev) => (append ? [...prev, ...result.data.questions] : result.data.questions))
      setHasMore(result.data.hasMore)
      setNextOffset(result.data.nextOffset)
      loadedLessonIdRef.current = lessonId
      setIsLoading(false)
      setIsLoadingMore(false)
    },
    [courseId, lessonId],
  )

  useEffect(() => {
    loadedLessonIdRef.current = null
    setQuestions([])
    setLoadError(null)
    setHasMore(false)
    setNextOffset(0)
  }, [lessonId])

  useEffect(() => {
    if (!isActive) return
    if (loadedLessonIdRef.current === lessonId) return

    void loadQuestions()
  }, [isActive, lessonId, loadQuestions])

  const handleSubmitQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    const result = await askQuestionAction({
      courseId,
      lessonId,
      question: questionText,
      isPublic,
    })

    setIsSubmitting(false)

    if (result.success) {
      setQuestionText('')
      setIsPublic(true)
      await loadQuestions()
      toast({ title: 'Pergunta enviada com sucesso' })
      return
    }

    toast({
      title: 'Erro',
      description: result.error || 'Não foi possível enviar sua pergunta',
      variant: 'destructive',
    })
  }

  const formatDate = (dateIso: string) =>
    new Date(dateIso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Fazer uma pergunta sobre esta aula</h3>
            <Textarea
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Descreva sua dúvida para o produtor..."
              rows={4}
              required
              minLength={10}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="question-public"
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="question-public" className="text-sm text-muted-foreground">
              Tornar pergunta pública para outros alunos
            </label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Enviando...' : 'Enviar pergunta'}
          </Button>
        </form>
      </Card>

      {questions.length > 0 ? (
        <div className="space-y-3">
          {questions.map((question) => {
            const isAnswered = Boolean(question.answer)

            return (
              <Card key={question.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {question.isMine ? 'Você' : question.authorName}
                    </span>
                    {!question.isPublic && <Badge variant="outline">Privada</Badge>}
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
                    <span className="text-xs text-muted-foreground">
                      {formatDate(question.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300">{question.question}</p>

                  {question.answer && (
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
                      <div className="mb-1 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          Resposta do produtor
                        </span>
                        {question.answeredAt && (
                          <span className="text-xs text-muted-foreground">
                            • {formatDate(question.answeredAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {question.answer}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              disabled={isLoadingMore}
              onClick={() => void loadQuestions({ append: true, offset: nextOffset })}
            >
              {isLoadingMore ? 'Carregando...' : 'Carregar mais perguntas'}
            </Button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando perguntas...</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">Falha ao carregar perguntas</h3>
          <p className="mb-4 text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => void loadQuestions()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">Nenhuma pergunta ainda</h3>
          <p className="text-sm text-muted-foreground">Faça a primeira pergunta sobre esta aula</p>
        </div>
      )}
    </div>
  )
}
