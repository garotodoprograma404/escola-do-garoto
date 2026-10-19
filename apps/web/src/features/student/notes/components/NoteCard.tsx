// =====================================================
// NOTE CARD - SERVER COMPONENT
// =====================================================

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { NoteActions } from './NoteActions.client'
import { ArrowUpRight, BookOpen, Clock, Video } from 'lucide-react'
import type { LessonNote } from '../types'

interface NoteCardProps {
  note: LessonNote
}

export function NoteCard({ note }: NoteCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const noteHref = note.course_slug
    ? `/student/courses/${note.course_slug}/player?lesson=${note.lesson_id}&tab=notes&note=${note.id}`
    : '/student/notes'

  return (
    <Card>
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pb-3 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-semibold leading-none sm:text-base">{note.title}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <Link href={noteHref} className="flex items-center gap-1 hover:text-foreground">
                <BookOpen className="h-3 w-3" />
                {note.course_title}
              </Link>
              <span>•</span>
              <Link href={noteHref} className="hover:text-foreground">
                {note.lesson_title}
              </Link>
            </div>
          </div>
          <NoteActions note={note} viewHref={noteHref} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
        <p className="whitespace-pre-wrap text-sm">{note.content}</p>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(note.created_at)}
          </div>
          {note.video_timestamp !== null && (
            <Badge variant="secondary" className="gap-1">
              <Video className="h-3 w-3" />
              {formatTimestamp(note.video_timestamp)}
            </Badge>
          )}
        </div>

        <div className="border-t pt-3">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href={noteHref}>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Visualizar anotação
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
