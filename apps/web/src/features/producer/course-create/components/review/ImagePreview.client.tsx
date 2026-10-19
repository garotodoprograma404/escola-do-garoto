'use client'

import { Image as ImageIcon } from 'lucide-react'

interface ImagePreviewProps {
  url?: string | null
  alt: string
  label: string
  aspectRatio?: 'video' | 'square' | 'wide'
}

/**
 * Componente para preview de imagens (thumbnail, cover, etc)
 * Mostra a imagem se existir, ou placeholder se não
 */
export function ImagePreview({ url, alt, label, aspectRatio = 'video' }: ImagePreviewProps) {
  const aspectClasses = {
    video: 'aspect-video', // 16:9
    square: 'aspect-square', // 1:1
    wide: 'aspect-[21/9]', // Ultra wide
  }

  if (!url) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
        <div
          className={`${aspectClasses[aspectRatio]} flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900`}
        >
          <ImageIcon className="h-8 w-8 text-slate-400 dark:text-slate-600" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Nenhuma imagem enviada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div
        className={`${aspectClasses[aspectRatio]} w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback se a imagem não carregar
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center gap-2">
                  <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p class="text-sm text-slate-600 dark:text-slate-400">Erro ao carregar imagem</p>
                </div>
              `
            }
          }}
        />
      </div>
    </div>
  )
}
