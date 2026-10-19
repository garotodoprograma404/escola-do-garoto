import { CheckCircle2, Circle, CircleDot, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import { isObjectiveQuestion, isSingleChoice, type QuizQuestionFeedback } from '../../lib/quiz-view'
import type { LessonQuizQuestion } from '../../types'

interface QuizQuestionCardProps {
  question: LessonQuizQuestion
  /** Posição da pergunta (começa em 0). */
  index: number
  selectedOptionIds: number[]
  feedback: QuizQuestionFeedback | null
  /** Mostra certo/errado e a explicação (o quiz permite e a pergunta já foi corrigida). */
  showAnswers: boolean
  /** Trava os cliques (enviando, pergunta já confirmada ou quiz finalizado). */
  disabled: boolean
  onToggleOption: (optionId: number) => void
}

function optionClass(selected: boolean, showAnswers: boolean, correct: boolean, wrong: boolean) {
  if (showAnswers) {
    if (correct) return 'border-green-600 bg-green-50 dark:bg-green-950/20'
    if (wrong) return 'border-red-600 bg-red-50 dark:bg-red-950/20'
    return 'border-border'
  }
  return selected ? 'border-primary bg-primary/5' : 'hover:bg-muted'
}

/** Pergunta atual do quiz: enunciado, imagem, alternativas e, quando liberado, o gabarito. */
export function QuizQuestionCard({
  question,
  index,
  selectedOptionIds,
  feedback,
  showAnswers,
  disabled,
  onToggleOption,
}: QuizQuestionCardProps) {
  const singleSelect = isSingleChoice(question)

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold">
            {index + 1}. {question.questionText}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{question.points} pts</Badge>
            {feedback?.isCorrect === true && <Badge className="bg-green-600">Correta</Badge>}
            {feedback?.isCorrect === false && <Badge variant="destructive">Incorreta</Badge>}
            {feedback?.isCorrect === null && <Badge variant="secondary">Correção manual</Badge>}
          </div>
        </div>

        {question.questionImageUrl && (
          <div className="overflow-hidden rounded-md border border-border bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={question.questionImageUrl}
              alt={question.questionImageAlt || 'Imagem da questão'}
              className="max-h-80 w-full object-contain"
              loading="lazy"
            />
          </div>
        )}

        {isObjectiveQuestion(question) && (
          <div className="space-y-2">
            {question.options.map((option) => {
              const selected = selectedOptionIds.includes(option.id)
              const isCorrectOption =
                showAnswers && (feedback?.correctOptionIds.includes(option.id) ?? false)
              const isIncorrectSelected = showAnswers && selected && !isCorrectOption

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onToggleOption(option.id)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border p-3 text-left',
                    optionClass(selected, showAnswers, isCorrectOption, isIncorrectSelected),
                  )}
                >
                  {isCorrectOption ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : isIncorrectSelected ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : singleSelect ? (
                    selected ? (
                      <CircleDot className="h-4 w-4 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )
                  ) : selected ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{option.optionText}</span>
                </button>
              )
            })}
          </div>
        )}

        {showAnswers && feedback?.explanation && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Explicação:</span> {feedback.explanation}
          </p>
        )}
      </div>
    </Card>
  )
}
