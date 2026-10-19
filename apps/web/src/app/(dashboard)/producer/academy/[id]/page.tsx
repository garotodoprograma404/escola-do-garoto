// =====================================================
// PRODUCER ACADEMY - CONTENT DETAIL PAGE
// =====================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { getAuthenticatedUserContext } from '@/shared/services/roleService'
import { getAcademyContentById } from '@/features/producer/academy'
import { MarkCompleteButton } from '@/features/producer/academy/components/MarkCompleteButton.client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AcademyContentPage({ params }: PageProps) {
  const authContext = await getAuthenticatedUserContext()
  if (!authContext) {
    redirect('/login')
  }
  if (!authContext.roles.includes('producer')) {
    redirect('/dashboard')
  }

  // Get content ID
  const { id } = await params

  // Fetch content
  const content = await getAcademyContentById(id, authContext.userId)

  const getDifficultyBadge = (difficulty: string) => {
    const variants = {
      beginner: { label: 'Iniciante', variant: 'default' as const },
      intermediate: { label: 'Intermediário', variant: 'secondary' as const },
      advanced: { label: 'Avançado', variant: 'outline' as const },
    }
    const config = variants[difficulty as keyof typeof variants]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      getting_started: 'Primeiros Passos',
      course_creation: 'Criação de Cursos',
      marketing: 'Marketing',
      sales: 'Vendas',
      analytics: 'Analytics',
      best_practices: 'Melhores Práticas',
    }
    return labels[category] || category
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back Button */}
      <Link href="/producer/academy">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Academia
        </Button>
      </Link>

      {/* Header */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <Badge variant="outline">{getCategoryLabel(content.category)}</Badge>
          {getDifficultyBadge(content.difficulty)}
          {content.durationMinutes && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {content.durationMinutes} min
            </Badge>
          )}
          {content.isCompleted && (
            <Badge variant="default" className="flex items-center gap-1 bg-green-600">
              <CheckCircle className="h-3 w-3" />
              Concluído
            </Badge>
          )}
        </div>
        <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-white">{content.title}</h1>
        {content.description && (
          <p className="text-lg text-slate-600 dark:text-slate-400">{content.description}</p>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {content.contentType === 'video' && content.videoUrl && (
            <div className="mb-6 aspect-video rounded-lg bg-slate-100 dark:bg-slate-800">
              <video controls className="h-full w-full rounded-lg" src={content.videoUrl}>
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </div>
          )}

          {content.contentType === 'article' && content.articleContent && (
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: content.articleContent }} />
            </div>
          )}

          {!content.videoUrl && !content.articleContent && (
            <div className="py-12 text-center text-slate-600 dark:text-slate-400">
              Conteúdo em breve...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Complete Button */}
      {!content.isCompleted && (
        <div className="flex justify-center">
          <MarkCompleteButton contentId={content.id} />
        </div>
      )}
    </div>
  )
}
