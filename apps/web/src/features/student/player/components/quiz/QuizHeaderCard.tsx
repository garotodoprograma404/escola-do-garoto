import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'

interface QuizHeaderCardProps {
  lessonTitle: string
  approvalRequired: boolean
  passingScore: number
  currentIndex: number
  totalQuestions: number
  answeredCount: number
  attemptsCount: number
  isCompleted: boolean
}

/** Título da aula e as etiquetas de andamento: nota mínima, pergunta atual, respondidas, tentativas. */
export function QuizHeaderCard({
  lessonTitle,
  approvalRequired,
  passingScore,
  currentIndex,
  totalQuestions,
  answeredCount,
  attemptsCount,
  isCompleted,
}: QuizHeaderCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Questionário da aula</p>
          <h2 className="text-lg font-semibold">{lessonTitle}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Quiz</Badge>
          {approvalRequired ? (
            <Badge variant="outline">Nota mínima: {passingScore}%</Badge>
          ) : (
            <Badge variant="outline">Aprovação opcional</Badge>
          )}
          <Badge variant="outline">
            Pergunta {currentIndex + 1}/{totalQuestions}
          </Badge>
          <Badge variant="outline">
            Respondidas {answeredCount}/{totalQuestions}
          </Badge>
          <Badge variant="outline">Tentativas: {attemptsCount}</Badge>
          {isCompleted && (
            <Badge className="bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Concluído
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}
