import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'
import type { QuizResult } from '../../lib/quiz-view'

interface QuizResultCardProps {
  result: QuizResult
  hasObjectiveQuestions: boolean
  allowRetake: boolean
  showAnswersAfter: boolean
  hasAttempt: boolean
}

/** Resultado da tentativa finalizada: situação, acertos, pontos, nota e avisos sobre nova tentativa. */
export function QuizResultCard({
  result,
  hasObjectiveQuestions,
  allowRetake,
  showAnswersAfter,
  hasAttempt,
}: QuizResultCardProps) {
  const title = result.approvalRequired
    ? result.passed
      ? 'Aprovado no quiz'
      : 'Quiz não aprovado'
    : 'Quiz concluído'

  return (
    <Card className={cn('p-4', result.passed ? 'border-green-600/40' : 'border-red-600/40')}>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {hasObjectiveQuestions && (
          <>
            <p className="text-sm text-muted-foreground">
              Acertos: {result.objectiveCorrectQuestions}/{result.objectiveTotalQuestions}
            </p>
            <p className="text-sm text-muted-foreground">
              Pontos: {result.objectiveScoredPoints}/{result.objectiveTotalPoints}
            </p>
          </>
        )}
        <p className="text-sm text-muted-foreground">
          {result.approvalRequired
            ? `Nota: ${result.scorePercentage}% (mínimo ${result.passingScore}%)`
            : `Nota: ${result.scorePercentage}% (sem nota mínima obrigatória)`}
        </p>
        {!result.passed && !allowRetake && (
          <p className="text-sm text-muted-foreground">
            Este quiz não permite nova tentativa automática.
          </p>
        )}
        {!showAnswersAfter && (
          <p className="text-sm text-muted-foreground">
            O gabarito detalhado não é exibido para este quiz.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Você pode navegar entre as perguntas para revisar suas respostas.
        </p>
        {hasAttempt && !allowRetake && (
          <p className="text-sm text-muted-foreground">
            Nova tentativa indisponível para este quiz.
          </p>
        )}
      </div>
    </Card>
  )
}
