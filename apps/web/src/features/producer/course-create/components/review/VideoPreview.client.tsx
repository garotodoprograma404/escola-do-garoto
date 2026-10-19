'use client'

import { Video, ExternalLink } from 'lucide-react'
import { detectVideoProvider, extractYouTubeId } from '../../lib/helpers'
import { parseVimeoVideo } from '@/shared/lib/vimeo'

interface VideoPreviewProps {
  url?: string | null
  label: string
}

/**
 * Componente para preview de vídeos (trailer, etc)
 * Suporta YouTube e Vimeo com embed
 */
export function VideoPreview({ url, label }: VideoPreviewProps) {
  if (!url) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          <Video className="h-8 w-8 text-slate-400 dark:text-slate-600" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum vídeo adicionado</p>
        </div>
      </div>
    )
  }

  const provider = detectVideoProvider(url)

  // YouTube embed
  if (provider === 'youtube') {
    const videoId = extractYouTubeId(url)
    if (videoId) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Abrir no YouTube
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black dark:border-slate-800">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="Video preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      )
    }
  }

  // Vimeo embed
  if (provider === 'vimeo') {
    const vimeoVideo = parseVimeoVideo(url)
    if (vimeoVideo) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Abrir no Vimeo
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-black dark:border-slate-800">
            <iframe
              src={vimeoVideo.embedUrl}
              title="Video preview"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      )
    }
  }

  // Fallback para outras URLs
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
        <Video className="h-10 w-10 text-slate-400 dark:text-slate-600" />
        <div className="space-y-2 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Preview não disponível para esta plataforma
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Abrir vídeo
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
