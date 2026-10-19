'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { parseVimeoVideo } from '@/shared/lib/vimeo'
import { useToast } from '@/shared/hooks/use-toast'

interface CoursePreviewTriggerProps {
  courseTitle: string
  thumbnailUrl: string | null
  previewTitle: string
  previewUrl: string | null
  previewText: string | null
}

type PreviewMode = 'youtube' | 'vimeo' | 'video' | 'iframe' | 'text' | 'none'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function normalizeTextContent(content: string | null): string {
  return (content || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolvePreview(
  url: string | null,
  text: string | null,
): {
  mode: PreviewMode
  embedUrl: string | null
  textContent: string | null
} {
  const normalizedText = normalizeTextContent(text)

  if (url) {
    const youtubeId = extractYouTubeId(url)
    if (youtubeId) {
      return {
        mode: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
        textContent: null,
      }
    }

    const vimeoVideo = parseVimeoVideo(url)
    if (vimeoVideo) {
      return {
        mode: 'vimeo',
        embedUrl: vimeoVideo.embedUrl,
        textContent: null,
      }
    }

    const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)

    if (isDirectVideo) {
      return {
        mode: 'video',
        embedUrl: url,
        textContent: null,
      }
    }

    return {
      mode: 'iframe',
      embedUrl: url,
      textContent: null,
    }
  }

  if (normalizedText.length > 0) {
    return {
      mode: 'text',
      embedUrl: null,
      textContent: normalizedText,
    }
  }

  return {
    mode: 'none',
    embedUrl: null,
    textContent: null,
  }
}

export function CoursePreviewTrigger({
  courseTitle,
  thumbnailUrl,
  previewTitle,
  previewUrl,
  previewText,
}: CoursePreviewTriggerProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const preview = useMemo(() => resolvePreview(previewUrl, previewText), [previewUrl, previewText])

  const handleOpen = () => {
    if (preview.mode === 'none') {
      toast({
        title: 'Preview indisponível',
        description: 'Este curso ainda não possui conteúdo de preview disponível.',
        variant: 'destructive',
      })
      return
    }

    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg bg-slate-900"
        aria-label="Abrir preview do curso"
      >
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={courseTitle}
            fill
            className="object-cover opacity-80 transition-opacity group-hover:opacity-60"
          />
        ) : (
          <div className="h-full w-full bg-slate-900" />
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg transition-transform group-hover:scale-110 sm:h-16 sm:w-16">
            <Play className="ml-1 h-5 w-5 fill-black text-black sm:h-6 sm:w-6" />
          </div>
        </div>
        <div className="absolute bottom-3 w-full text-center text-xs font-bold text-white drop-shadow-md sm:bottom-4 sm:text-sm">
          Pré-visualizar curso
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl border-slate-800 bg-slate-950 p-0 text-white">
          <DialogHeader className="border-b border-slate-800 p-4 pb-3 text-left">
            <DialogTitle className="text-base sm:text-lg">{previewTitle}</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Pré-visualização gratuita do curso
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 pt-3">
            {(preview.mode === 'youtube' ||
              preview.mode === 'vimeo' ||
              preview.mode === 'iframe') &&
              preview.embedUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black">
                  <iframe
                    src={preview.embedUrl}
                    title={previewTitle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              )}

            {preview.mode === 'video' && preview.embedUrl && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-800 bg-black">
                <video controls preload="metadata" src={preview.embedUrl} className="h-full w-full">
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              </div>
            )}

            {preview.mode === 'text' && (
              <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm leading-relaxed text-slate-200">
                {preview.textContent}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
