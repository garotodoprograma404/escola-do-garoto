// =====================================================
// PLAYER TABS - CLIENT COMPONENT
// =====================================================

'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { FileText, StickyNote, MessageCircle } from 'lucide-react'
import type { CourseLesson, PlayerTab } from '../types'

interface PlayerTabsProps {
  lesson: CourseLesson
  courseId: number
  currentVideoTime: number
  initialTab: PlayerTab
  highlightedNoteId?: string
}

export function PlayerTabs({
  lesson,
  courseId,
  currentVideoTime,
  initialTab,
  highlightedNoteId,
}: PlayerTabsProps) {
  const [activeTab, setActiveTab] = useState<PlayerTab>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, lesson.id])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as PlayerTab)}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Visão Geral</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-2">
          <StickyNote className="h-4 w-4" />
          <span className="hidden sm:inline">Anotações</span>
        </TabsTrigger>
        <TabsTrigger value="questions" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Perguntas</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        <OverviewTab lesson={lesson} />
      </TabsContent>

      <TabsContent value="notes" className="mt-6">
        <NotesTab
          lessonId={lesson.id}
          courseId={courseId}
          isActive={activeTab === 'notes'}
          currentVideoTime={currentVideoTime}
          enableVideoTimestamp={lesson.type === 'video'}
          highlightedNoteId={highlightedNoteId}
        />
      </TabsContent>

      <TabsContent value="questions" className="mt-6">
        <QuestionsTab
          courseId={courseId}
          lessonId={lesson.id}
          isActive={activeTab === 'questions'}
        />
      </TabsContent>
    </Tabs>
  )
}

// Overview Tab
function OverviewTab({ lesson }: { lesson: CourseLesson }) {
  return (
    <div className="space-y-6">
      {lesson.description && (
        <div>
          <h3 className="mb-2 font-semibold">Sobre esta aula</h3>
          <p className="text-muted-foreground">{lesson.description}</p>
        </div>
      )}

      {lesson.contentText && (
        <div>
          <h3 className="mb-2 font-semibold">Conteúdo</h3>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: lesson.contentText }}
          />
        </div>
      )}

      {!lesson.description && !lesson.contentText && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma descrição disponível para esta aula</p>
        </div>
      )}
    </div>
  )
}

// Notes Tab (will be detailed in next file)
import { NotesTab } from './NotesTab.client'
import { QuestionsTab } from './QuestionsTab.client'
