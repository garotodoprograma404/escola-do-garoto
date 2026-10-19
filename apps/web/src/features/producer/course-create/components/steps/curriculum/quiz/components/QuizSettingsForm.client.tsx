'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import type { QuizSettings } from '../types'

interface QuizSettingsFormProps {
  settings: QuizSettings
  onUpdate: (updates: Partial<QuizSettings>) => void
  onClose: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function QuizSettingsForm({ settings, onUpdate, onClose }: QuizSettingsFormProps) {
  const approvalEnabled = settings.passing_score > 0
  const lastApprovalScoreRef = useRef<number>(approvalEnabled ? settings.passing_score : 70)

  useEffect(() => {
    if (settings.passing_score > 0) {
      lastApprovalScoreRef.current = settings.passing_score
    }
  }, [settings.passing_score])

  const handleApprovalToggle = (checked: boolean): void => {
    if (checked) {
      onUpdate({
        passing_score: clamp(lastApprovalScoreRef.current, 1, 100),
      })
      return
    }

    onUpdate({ passing_score: 0 })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="approval_required">Exigir Aprovação no Quiz</Label>
            <p className="text-xs text-muted-foreground">
              Quando desativado, o quiz funciona como atividade sem travar o avanço do aluno.
            </p>
          </div>
          <Switch
            id="approval_required"
            checked={approvalEnabled}
            onCheckedChange={handleApprovalToggle}
          />
        </div>

        {approvalEnabled ? (
          <div className="space-y-2">
            <Label htmlFor="passing_score">Nota Mínima para Aprovação (%)</Label>
            <Input
              id="passing_score"
              type="number"
              min={1}
              max={100}
              value={settings.passing_score}
              onChange={(e) => {
                const parsed = Number.parseInt(e.target.value, 10)
                const nextScore = Number.isNaN(parsed) ? 1 : clamp(parsed, 1, 100)
                onUpdate({ passing_score: nextScore })
              }}
              placeholder="Ex: 70"
            />
            <p className="text-xs text-muted-foreground">
              Exemplo: 70 significa que o aluno precisa acertar 70% para ser aprovado.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Aprovação desativada: a nota será informativa e não bloqueará a conclusão.
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="time_limit">Tempo Máximo para Responder (minutos)</Label>
          <Input
            id="time_limit"
            type="number"
            min={1}
            value={settings.time_limit_minutes || ''}
            onChange={(e) =>
              onUpdate({
                time_limit_minutes: e.target.value
                  ? Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                  : undefined,
              })
            }
            placeholder="Ex: 30 (opcional)"
          />
          <p className="text-xs text-muted-foreground">
            Deixe vazio para permitir resposta sem limite de tempo.
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h4 className="font-medium">Configurações Avançadas</h4>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="allow_retake">Permitir Refazer</Label>
            <p className="text-xs text-muted-foreground">
              O aluno poderá enviar uma nova tentativa após concluir o quiz.
            </p>
          </div>
          <Switch
            id="allow_retake"
            checked={settings.allow_retake}
            onCheckedChange={(checked) => onUpdate({ allow_retake: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show_answers">Mostrar Respostas</Label>
            <p className="text-xs text-muted-foreground">
              Exibe gabarito e explicações depois do envio da tentativa.
            </p>
          </div>
          <Switch
            id="show_answers"
            checked={settings.show_answers_after}
            onCheckedChange={(checked) => onUpdate({ show_answers_after: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="shuffle_questions">Embaralhar Questões</Label>
            <p className="text-xs text-muted-foreground">
              Cada aluno recebe as questões em ordem diferente.
            </p>
          </div>
          <Switch
            id="shuffle_questions"
            checked={settings.shuffle_questions}
            onCheckedChange={(checked) => onUpdate({ shuffle_questions: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="shuffle_options">Embaralhar Opções</Label>
            <p className="text-xs text-muted-foreground">
              Cada questão pode mostrar alternativas em ordem diferente.
            </p>
          </div>
          <Switch
            id="shuffle_options"
            checked={settings.shuffle_options}
            onCheckedChange={(checked) => onUpdate({ shuffle_options: checked })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}
