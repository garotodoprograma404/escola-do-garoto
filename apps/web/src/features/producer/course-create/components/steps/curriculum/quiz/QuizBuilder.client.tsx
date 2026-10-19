'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Plus, Settings, BookOpen } from 'lucide-react'
import { QuestionItem } from './components/QuestionItem.client'
import { QuestionFormModal } from './modals/QuestionFormModal.client'
import { QuizSettingsModal } from './modals/QuizSettingsModal.client'
import { useQuestions } from './hooks/useQuestions'
import { useQuizSettings } from './hooks/useQuizSettings'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import type { QuestionFormData, QuizQuestion, QuizSettings } from './types'

// Fora do componente: um `= []` na lista de parâmetros seria um array novo a cada render e faria o
// efeito de `useQuestions` (que depende dele) refazer o estado sem parar.
const NO_QUESTIONS: QuizQuestion[] = []

interface QuizBuilderProps {
  initialQuestions?: QuizQuestion[]
  initialSettings?: QuizSettings
  onChange?: (questions: QuizQuestion[], settings: QuizSettings) => void
}

export function QuizBuilder({
  initialQuestions = NO_QUESTIONS,
  initialSettings,
  onChange,
}: QuizBuilderProps) {
  const { questions, addQuestion, updateQuestion, deleteQuestion, reorderQuestions } =
    useQuestions(initialQuestions)
  const { settings, updateSettings } = useQuizSettings(initialSettings)

  const [questionModalOpen, setQuestionModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null)
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<string[]>([])
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const handleAddQuestion = (data: QuestionFormData): void => {
    addQuestion(data)
  }

  const handleUpdateQuestion = (data: QuestionFormData): void => {
    if (editingQuestion) {
      updateQuestion(editingQuestion.id, data)
      setEditingQuestion(null)
    }
  }

  const handleDeleteQuestion = (): void => {
    if (deletingQuestionId) {
      deleteQuestion(deletingQuestionId)
      setDeletingQuestionId(null)
    }
  }

  const handleEditClick = (question: QuizQuestion): void => {
    setEditingQuestion(question)
    setQuestionModalOpen(true)
  }

  const handleMoveQuestionUp = (index: number): void => {
    if (index <= 0) return
    reorderQuestions(index, index - 1)
  }

  const handleMoveQuestionDown = (index: number): void => {
    if (index >= questions.length - 1) return
    reorderQuestions(index, index + 1)
  }

  const handleToggleQuestion = (questionId: string): void => {
    setExpandedQuestionIds((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  const handleExpandAllQuestions = (): void => {
    setExpandedQuestionIds(questions.map((question) => question.id))
  }

  const handleCollapseAllQuestions = (): void => {
    setExpandedQuestionIds([])
  }

  const handleModalClose = (): void => {
    setQuestionModalOpen(false)
    setEditingQuestion(null)
  }

  useEffect(() => {
    onChangeRef.current?.(questions, settings)
  }, [questions, settings])

  useEffect(() => {
    setExpandedQuestionIds((prev) =>
      prev.filter((questionId) => questions.some((question) => question.id === questionId)),
    )
  }, [questions])

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const approvalEnabled = settings.passing_score > 0

  return (
    <div className="min-w-0 space-y-4">
      {/* Header com ações */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Construtor de Quiz</h3>
          <p className="text-sm text-muted-foreground">
            Monte sua avaliação com linguagem clara para o aluno
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
          <Button type="button" size="sm" onClick={() => setQuestionModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Questão
          </Button>
        </div>
      </div>

      {/* Resumo do Quiz */}
      {questions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" />
              Resumo do Quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Questões</p>
                <p className="text-2xl font-bold">{questions.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pontos Totais</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Aprovação</p>
                <p className="text-2xl font-bold">
                  {approvalEnabled ? `${settings.passing_score}%` : 'Opcional'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tempo Limite</p>
                <p className="text-2xl font-bold">
                  {settings.time_limit_minutes ? `${settings.time_limit_minutes}min` : '∞'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Questões */}
      {questions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {expandedQuestionIds.length} de {questions.length} questões expandidas
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleExpandAllQuestions}
                disabled={expandedQuestionIds.length === questions.length}
              >
                Expandir Todas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCollapseAllQuestions}
                disabled={expandedQuestionIds.length === 0}
              >
                Recolher Todas
              </Button>
            </div>
          </div>
          {questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedQuestionIds.includes(question.id)}
              isFirst={index === 0}
              isLast={index === questions.length - 1}
              onToggleExpand={() => handleToggleQuestion(question.id)}
              onMoveUp={() => handleMoveQuestionUp(index)}
              onMoveDown={() => handleMoveQuestionDown(index)}
              onEdit={() => handleEditClick(question)}
              onDelete={() => setDeletingQuestionId(question.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Nenhuma questão criada</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Comece adicionando questões para o seu quiz
            </p>
            <Button onClick={() => setQuestionModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Questão
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Questão */}
      <QuestionFormModal
        open={questionModalOpen}
        onClose={handleModalClose}
        onSubmit={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
        initialData={
          editingQuestion
            ? {
                type: editingQuestion.type,
                question_text: editingQuestion.question_text,
                question_image_url: editingQuestion.question_image_url || '',
                question_image_alt: editingQuestion.question_image_alt || '',
                explanation: editingQuestion.explanation || '',
                points: editingQuestion.points,
                options: editingQuestion.options,
              }
            : undefined
        }
      />

      {/* Modal de Configurações */}
      <QuizSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdate={(updates) => {
          updateSettings(updates)
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingQuestionId}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingQuestionId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Questão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
