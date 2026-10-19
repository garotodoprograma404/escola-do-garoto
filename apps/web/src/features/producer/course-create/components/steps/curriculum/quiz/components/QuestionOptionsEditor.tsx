import { Check, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { canAddOption, canRemoveOption } from '../lib/question-options'
import type { QuestionType, QuizOption } from '../types'

const HELP_TEXT: Record<QuestionType, string> = {
  multiple_answer: 'Clique nos círculos para marcar as respostas corretas',
  true_false: 'Selecione apenas uma opção correta (Verdadeiro ou Falso)',
  multiple_choice: 'Clique no círculo para marcar a resposta correta',
}

interface QuestionOptionsEditorProps {
  type: QuestionType
  options: QuizOption[]
  error?: string
  onAdd: () => void
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<QuizOption>) => void
  onToggleCorrect: (id: string) => void
}

/** Alternativas da questão: texto, marcação da(s) correta(s), adicionar e remover. */
export function QuestionOptionsEditor({
  type,
  options,
  error,
  onAdd,
  onRemove,
  onUpdate,
  onToggleCorrect,
}: QuestionOptionsEditorProps) {
  const letter = (index: number) => String.fromCharCode(65 + index)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Opções de Resposta</Label>
        {canAddOption(type, options) && (
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar Opção
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex min-w-0 items-start gap-2">
            <button
              type="button"
              onClick={() => onToggleCorrect(option.id)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                option.is_correct
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-muted-foreground/30 hover:border-muted-foreground'
              }`}
              title={option.is_correct ? 'Resposta correta' : 'Marcar como correta'}
            >
              {option.is_correct && <Check className="h-4 w-4" />}
            </button>

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {letter(index)}
            </span>

            <Input
              value={option.option_text}
              onChange={(event) => onUpdate(option.id, { option_text: event.target.value })}
              placeholder={`Alternativa ${letter(index)}`}
              disabled={type === 'true_false'}
              className="min-w-0 flex-1"
            />

            {canRemoveOption(type, options) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(option.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">{HELP_TEXT[type]}</p>
    </div>
  )
}
