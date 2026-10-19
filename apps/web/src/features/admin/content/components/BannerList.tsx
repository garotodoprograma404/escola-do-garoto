'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Calendar,
  MousePointer,
  Edit,
  Trash2,
  MoveUp,
  MoveDown,
  Smartphone,
  ImageOff,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import type { Banner, ContentStatus } from '../types'

interface BannerListProps {
  banners: Banner[]
  onEdit: (banner: Banner) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
}

function getStatusBadge(
  status: ContentStatus,
  daysUntilExpiration?: number | null,
): React.ReactNode {
  switch (status) {
    case 'active':
      // Show expiration warning if less than 7 days
      if (
        daysUntilExpiration !== null &&
        daysUntilExpiration !== undefined &&
        daysUntilExpiration <= 7 &&
        daysUntilExpiration > 0
      ) {
        return (
          <div className="flex flex-col gap-1">
            <Badge
              variant="default"
              className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              Ativo
            </Badge>
            <Badge
              variant="secondary"
              className="bg-orange-100 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
            >
              Expira em {daysUntilExpiration}d
            </Badge>
          </div>
        )
      }
      return (
        <Badge
          variant="default"
          className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          Ativo
        </Badge>
      )
    case 'scheduled':
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        >
          Agendado
        </Badge>
      )
    case 'expired':
      const daysExpired =
        daysUntilExpiration !== null && daysUntilExpiration !== undefined
          ? Math.abs(daysUntilExpiration)
          : null
      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          >
            Expirado
          </Badge>
          {daysExpired && (
            <span className="text-xs text-red-700 dark:text-red-400">há {daysExpired}d</span>
          )}
        </div>
      )
    default:
      return <Badge variant="outline">Inativo</Badge>
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface BannerImagePreviewProps {
  imageUrl: string
  title: string
  hasMobileImage: boolean
}

function BannerImagePreview({ imageUrl, title, hasMobileImage }: BannerImagePreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <ImageOff size={32} className="mb-2" />
        <span className="px-2 text-center text-xs">Erro ao carregar imagem</span>
      </div>
    )
  }

  return (
    <>
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700" />
      )}

      {/* Image */}
      <Image
        src={imageUrl}
        alt={title}
        fill
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        sizes="(max-width: 1024px) 100vw, 256px"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />

      {/* Mobile Badge Overlay */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {hasMobileImage ? (
          <div
            className="rounded bg-black/70 p-1.5 text-xs text-white backdrop-blur-sm"
            title="Mobile Otimizado"
          >
            <Smartphone size={14} />
          </div>
        ) : (
          <div
            className="rounded bg-yellow-500/90 p-1.5 text-xs text-black backdrop-blur-sm"
            title="Sem imagem mobile"
          >
            <Smartphone size={14} />
          </div>
        )}
      </div>
    </>
  )
}

export function BannerList({ banners, onEdit, onDelete, onMove }: BannerListProps) {
  if (banners.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhum banner encontrado. Crie o primeiro banner.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {banners.map((banner, index) => {
        return (
          <div
            key={banner.id}
            className="flex flex-col items-center gap-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-500/50 dark:border-slate-800 dark:bg-slate-900 lg:flex-row"
          >
            {/* Visual Preview */}
            <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 lg:w-64">
              <BannerImagePreview
                imageUrl={banner.desktopImageUrl}
                title={banner.title}
                hasMobileImage={!!banner.mobileImageUrl}
              />
            </div>

            {/* Info */}
            <div className="w-full flex-1 space-y-2 text-center lg:text-left">
              <div className="flex flex-col items-center justify-between gap-2 lg:flex-row lg:items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {banner.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{banner.subtitle}</p>
                </div>
                <div>{getStatusBadge(banner.status, banner.daysUntilExpiration)}</div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600 dark:text-slate-400 lg:justify-start">
                <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
                  <Calendar size={12} />
                  {formatDate(banner.startDate)}
                  {banner.endDate ? ` - ${formatDate(banner.endDate)}` : ' (Sem fim)'}
                </span>

                {/* Metrics */}
                <div className="flex items-center gap-3 border-l border-slate-200 pl-2 dark:border-slate-800">
                  <span className="flex items-center gap-1" title="Cliques Totais">
                    <MousePointer size={12} /> <strong>{banner.clicks} cliques</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 lg:w-auto lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <div className="mr-2 flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(banner.id, 'up')}
                  disabled={index === 0}
                  className="h-8 w-8"
                >
                  <MoveUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onMove(banner.id, 'down')}
                  disabled={index === banners.length - 1}
                  className="h-8 w-8"
                >
                  <MoveDown size={16} />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(banner)}
                aria-label={`Editar banner ${banner.title}`}
              >
                <Edit size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(banner.id)}
                aria-label={`Excluir banner ${banner.title}`}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
