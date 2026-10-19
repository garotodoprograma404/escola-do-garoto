'use client'

import { useState } from 'react'
import { FileText, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  formatCourseLevel,
  generateCourseUrl,
  getCategoryName,
  truncateText,
} from '../../lib/helpers'
import type { CompleteCourseFormData } from '../../types'
import { ImagePreview } from './ImagePreview.client'
import { ReviewField } from './ReviewField.client'
import { ReviewSection } from './ReviewSection.client'
import { VideoPreview } from './VideoPreview.client'

interface ReviewBasicInfoProps {
  data: CompleteCourseFormData
  categories: { id: number; name: string }[]
}

/** Revisão das informações básicas: título, URL, categoria, descrições e mídias sob demanda. */
export function ReviewBasicInfo({ data, categories }: ReviewBasicInfoProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [showMedia, setShowMedia] = useState(false)

  const mediaItemsCount = [data.thumbnail_url, data.cover_image_url, data.trailer_url].filter(
    Boolean,
  ).length

  return (
    <ReviewSection
      title="Informações Básicas"
      icon={<FileText className="h-5 w-5" />}
      collapsible
      defaultExpanded
    >
      <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ReviewField label="Título" value={data.title} fullWidth />

        <ReviewField
          label="URL do Curso"
          value={
            <div className="flex items-center gap-2">
              <LinkIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
              <span className="font-mono text-xs text-brand-600 dark:text-brand-400">
                {generateCourseUrl(data.slug)}
              </span>
            </div>
          }
          fullWidth
        />

        <ReviewField label="Categoria" value={getCategoryName(data.category_id, categories)} />

        <ReviewField label="Nível" value={formatCourseLevel(data.level)} />

        <ReviewField
          label="Descrição Curta"
          value={
            <div className="space-y-1">
              <p className="text-slate-700 dark:text-slate-300">{data.short_description}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {data.short_description?.length || 0}/5000 caracteres
              </p>
            </div>
          }
          fullWidth
        />

        <ReviewField
          label="Descrição Completa"
          value={
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                {showFullDescription ? data.description : truncateText(data.description, 200)}
              </p>
              {data.description.length > 200 && (
                <button
                  type="button"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  {showFullDescription ? 'Ver menos' : 'Ver mais'}
                </button>
              )}
            </div>
          }
          fullWidth
        />
      </dl>

      {mediaItemsCount > 0 && (
        <div className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">Mídias do curso</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMedia((current) => !current)}
            >
              {showMedia ? 'Ocultar mídias' : `Mostrar mídias (${mediaItemsCount})`}
            </Button>
          </div>

          {showMedia && (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {data.thumbnail_url && (
                  <ImagePreview
                    url={data.thumbnail_url}
                    alt="Thumbnail do curso"
                    label="Thumbnail"
                    aspectRatio="video"
                  />
                )}

                {data.cover_image_url && (
                  <ImagePreview
                    url={data.cover_image_url}
                    alt="Capa do curso"
                    label="Imagem de Capa"
                    aspectRatio="video"
                  />
                )}
              </div>

              {data.trailer_url && (
                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <VideoPreview url={data.trailer_url} label="Vídeo de Preview" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ReviewSection>
  )
}
