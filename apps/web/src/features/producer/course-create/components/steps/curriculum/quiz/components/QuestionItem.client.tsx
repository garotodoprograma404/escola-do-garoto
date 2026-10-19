'use client'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Trash2 } from 'lucide-react'
import type { QuizQuestion } from '../types'
import { QUESTION_TYPES } from '../constants'

interface QuestionItemProps {
  question: QuizQuestion
  index: number
  isExpanded: boolean
  isFirst: boolean
  isLast: boolean
  onToggleExpand: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onEdit: () => void
  onDelete: () => void
}

export function QuestionItem({
  question,
  index,
  isExpanded,
  isFirst,
  isLast,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: QuestionItemProps) {
  const questionType = QUESTION_TYPES.find((t) => t.value === question.type)
  const hasOptions = ['multiple_choice', 'multiple_answer', 'true_false'].includes(question.type)

  return (
    <Card className="group relative overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-start gap-3 space-y-0 pb-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="min-w-0 flex-1 text-left"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Recolher questão' : 'Expandir questão'}
        >
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="shrink-0 text-sm font-medium text-muted-foreground">
                Questão {index + 1}
              </span>
              <Badge variant="secondary" className="max-w-full whitespace-nowrap text-xs">
                {questionType?.icon} {questionType?.label}
              </Badge>
              <Badge variant="outline" className="max-w-full whitespace-nowrap text-xs">
                {question.points} {question.points === 1 ? 'ponto' : 'pontos'}
              </Badge>
              {question.question_image_url && (
                <Badge variant="outline" className="max-w-full whitespace-nowrap text-xs">
                  Com imagem
                </Badge>
              )}
            </div>
            <ChevronDown
              className={`ml-auto mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
          {!isExpanded && (
            <p className="mt-1 break-words pr-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
              {question.question_text}
            </p>
          )}
        </button>

        <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            className="h-8 w-8 p-0"
            disabled={isFirst}
            title="Mover para cima"
            aria-label="Mover questão para cima"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            className="h-8 w-8 p-0"
            disabled={isLast}
            title="Mover para baixo"
            aria-label="Mover questão para baixo"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0"
            title="Editar questão"
            aria-label="Editar questão"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Excluir questão"
            aria-label="Excluir questão"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <p className="break-words text-sm [overflow-wrap:anywhere]">{question.question_text}</p>

          {question.question_image_url && (
            <div className="overflow-hidden rounded-md border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={question.question_image_url}
                alt={question.question_image_alt || 'Imagem da questão'}
                className="max-h-64 w-full object-contain"
                loading="lazy"
              />
            </div>
          )}

          {hasOptions && question.options.length > 0 && (
            <div className="space-y-1.5 rounded-md bg-muted/50 p-3">
              {question.options.map((option, idx) => (
                <div key={option.id} className="flex min-w-0 items-start gap-2 text-sm">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      option.is_correct
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span
                    className={`${option.is_correct ? 'font-medium' : ''} min-w-0 break-words [overflow-wrap:anywhere]`}
                  >
                    {option.option_text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {question.explanation && (
            <div className="break-words rounded-md bg-blue-50 p-3 text-sm text-blue-900 [overflow-wrap:anywhere] dark:bg-blue-950 dark:text-blue-100">
              <span className="font-medium">Explicação:</span> {question.explanation}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
