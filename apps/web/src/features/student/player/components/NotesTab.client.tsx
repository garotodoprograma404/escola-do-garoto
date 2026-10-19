// =====================================================
// NOTES TAB - CLIENT COMPONENT
// =====================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, StickyNote, Trash2, Clock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Card } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { createNoteAction, deleteNoteAction, getLessonNotesAction } from '../actions/note-actions'
import { useToast } from '@/shared/hooks/use-toast'
import type { LessonNote } from '../types'

interface NotesTabProps {
  isActive: boolean
  lessonId: number
  courseId: number
  currentVideoTime: number
  enableVideoTimestamp: boolean
  highlightedNoteId?: string
}

export function NotesTab({
  isActive,
  lessonId,
  courseId,
  currentVideoTime,
  enableVideoTimestamp,
  highlightedNoteId,
}: NotesTabProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [notes, setNotes] = useState<LessonNote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { toast } = useToast()
  const loadedLessonIdRef = useRef<number | null>(null)

  const loadNotes = useCallback(async (targetLessonId: number) => {
    setIsLoading(true)
    setLoadError(null)

    const result = await getLessonNotesAction({ lessonId: targetLessonId })

    if (!result.success || !result.data) {
      setLoadError(result.error || 'Não foi possível carregar as anotações')
      setIsLoading(false)
      return
    }

    setNotes(result.data)
    loadedLessonIdRef.current = targetLessonId
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadedLessonIdRef.current = null
    setNotes([])
    setLoadError(null)
  }, [lessonId])

  useEffect(() => {
    if (!isActive) return
    if (loadedLessonIdRef.current === lessonId) return

    void loadNotes(lessonId)
  }, [isActive, lessonId, loadNotes])

  useEffect(() => {
    if (!highlightedNoteId || notes.length === 0) return

    const highlightedNote = document.getElementById(`note-${highlightedNoteId}`)
    if (!highlightedNote) return

    highlightedNote.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightedNoteId, notes])

  const handleDelete = async (noteId: string) => {
    const result = await deleteNoteAction(noteId)
    if (result.success) {
      toast({ title: 'Anotação excluída com sucesso' })
      await loadNotes(lessonId)
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
  }

  const formatTimestamp = (seconds: number | null) => {
    if (seconds === null) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-4">
      {/* Create Note Button */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Nova Anotação
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Anotação</DialogTitle>
          </DialogHeader>
          <NoteForm
            lessonId={lessonId}
            courseId={courseId}
            currentVideoTime={Math.floor(currentVideoTime)}
            enableVideoTimestamp={enableVideoTimestamp}
            onSuccess={() => {
              setIsCreating(false)
              toast({ title: 'Anotação criada com sucesso' })
              void loadNotes(lessonId)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Notes List */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              id={`note-${note.id}`}
              className={cn(
                'p-4',
                note.id === highlightedNoteId &&
                  'shadow-[0_0_0_1px_hsl(var(--primary)/0.35)] ring-2 ring-primary/50',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{note.title}</h4>
                    {note.videoTimestamp !== null && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(note.videoTimestamp)}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {note.content}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(note.id)}
                  className="shrink-0 text-destructive hover:bg-destructive/10"
                  aria-label={`Excluir anotação ${note.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <StickyNote className="mb-4 h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Carregando anotações...</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <StickyNote className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">Falha ao carregar anotações</h3>
          <p className="mb-4 text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => void loadNotes(lessonId)}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <StickyNote className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">Nenhuma anotação ainda</h3>
          <p className="text-sm text-muted-foreground">
            Crie anotações para lembrar de pontos importantes
          </p>
        </div>
      )}
    </div>
  )
}

// Note Form Component
function NoteForm({
  lessonId,
  courseId,
  currentVideoTime,
  enableVideoTimestamp,
  onSuccess,
}: {
  lessonId: number
  courseId: number
  currentVideoTime: number
  enableVideoTimestamp: boolean
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [includeTimestamp, setIncludeTimestamp] = useState(enableVideoTimestamp)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const result = await createNoteAction({
      lessonId,
      courseId,
      title,
      content,
      videoTimestamp: enableVideoTimestamp && includeTimestamp ? currentVideoTime : null,
    })

    setIsSubmitting(false)

    if (result.success) {
      onSuccess()
    } else {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          placeholder="Título da anotação"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <Textarea
          placeholder="Escreva sua anotação..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
        />
      </div>
      {enableVideoTimestamp && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="timestamp"
            checked={includeTimestamp}
            onChange={(e) => setIncludeTimestamp(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="timestamp" className="text-sm">
            Incluir timestamp do vídeo ({Math.floor(currentVideoTime / 60)}:
            {(currentVideoTime % 60).toString().padStart(2, '0')})
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Salvando...' : 'Salvar Anotação'}
        </Button>
      </div>
    </form>
  )
}
