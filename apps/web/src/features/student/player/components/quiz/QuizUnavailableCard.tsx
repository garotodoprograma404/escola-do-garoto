import { HelpCircle } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'

/** Cartão no lugar do quiz quando ele não pode ser aberto (sem matrícula, sem perguntas, falha). */
export function QuizUnavailableCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="flex aspect-video items-center justify-center p-6 text-center">
      <div>
        <HelpCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="mb-1 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  )
}
