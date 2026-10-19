// =====================================================
// PRODUCER ACADEMY - CONTENT GRID
// =====================================================

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Progress } from '@/shared/components/ui/progress'
import {
  PlayCircle,
  FileText,
  HelpCircle,
  Download,
  Clock,
  CheckCircle,
  BookOpen,
} from 'lucide-react'
import type { AcademyContent } from '../types'

interface ContentGridProps {
  contents: AcademyContent[]
}

export function ContentGrid({ contents }: ContentGridProps) {
  if (contents.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
            Nenhum conteúdo encontrado
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Tente ajustar os filtros para ver mais conteúdos
          </p>
        </CardContent>
      </Card>
    )
  }

  const getContentIcon = (type: AcademyContent['contentType']) => {
    const icons = {
      video: PlayCircle,
      article: FileText,
      quiz: HelpCircle,
      resource: Download,
    }
    return icons[type] || FileText
  }

  const getDifficultyBadge = (difficulty: AcademyContent['difficulty']) => {
    const variants = {
      beginner: { label: 'Iniciante', variant: 'default' as const },
      intermediate: { label: 'Intermediário', variant: 'secondary' as const },
      advanced: { label: 'Avançado', variant: 'outline' as const },
    }
    const config = variants[difficulty]
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    )
  }

  const getCategoryLabel = (category: AcademyContent['category']) => {
    const labels = {
      getting_started: 'Primeiros Passos',
      course_creation: 'Criação de Cursos',
      marketing: 'Marketing',
      sales: 'Vendas',
      analytics: 'Analytics',
      best_practices: 'Melhores Práticas',
    }
    return labels[category]
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {contents.map((content) => {
        const Icon = getContentIcon(content.contentType)

        return (
          <Link key={content.id} href={`/producer/academy/${content.id}`}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
              <CardContent className="p-0">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                  {content.thumbnailUrl ? (
                    <Image
                      src={content.thumbnailUrl}
                      alt={content.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Icon className="h-12 w-12 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                  {content.isCompleted && (
                    <div className="absolute right-2 top-2 rounded-full bg-green-500 p-1.5 text-white">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                  {content.durationMinutes && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      <Clock className="h-3 w-3" />
                      {content.durationMinutes} min
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryLabel(content.category)}
                    </Badge>
                    {getDifficultyBadge(content.difficulty)}
                  </div>

                  <h3 className="mb-2 line-clamp-2 font-semibold text-slate-900 dark:text-white">
                    {content.title}
                  </h3>

                  {content.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                      {content.description}
                    </p>
                  )}

                  {/* Progress */}
                  {content.progress !== undefined &&
                    content.progress > 0 &&
                    !content.isCompleted && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>Progresso</span>
                          <span>{content.progress}%</span>
                        </div>
                        <Progress value={content.progress} className="h-1.5" />
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
