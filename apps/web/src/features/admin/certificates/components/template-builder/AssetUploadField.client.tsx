'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { cn } from '@/shared/lib/utils'
import { ASSET_ALLOWED_MIME_TYPES } from './useAssetUpload'

interface AssetUploadFieldProps {
  label: string
  previewAlt: string
  emptyText: string
  previewUrl: string | null
  path: string | null
  uploading: boolean
  /** Algum envio em andamento (de qualquer campo): trava os botões. */
  busy: boolean
  /** Rótulos curtos do botão (as assinaturas usam "Enviar"/"Alterar"). */
  uploadLabel?: string
  replaceLabel?: string
  /** `cover` para fundo da página; `contain` para assinatura. */
  fit: 'cover' | 'contain'
  heightClass: string
  onPick: (file: File) => void
  onRemove: () => void
}

/** Campo de imagem do modelo: prévia, enviar/trocar, remover e o caminho guardado. */
export function AssetUploadField({
  label,
  previewAlt,
  emptyText,
  previewUrl,
  path,
  uploading,
  busy,
  uploadLabel = 'Enviar',
  replaceLabel = 'Alterar',
  fit,
  heightClass,
  onPick,
  onRemove,
}: AssetUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950',
          heightClass,
        )}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={previewAlt}
            fill
            unoptimized
            className={fit === 'cover' ? 'object-cover' : 'object-contain p-2'}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-600 dark:text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? 'Enviando...' : path ? replaceLabel : uploadLabel}
        </Button>
        {path ? (
          <Button type="button" variant="outline" size="sm" onClick={onRemove} disabled={busy}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remover
          </Button>
        ) : null}
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-400">
        Caminho: {path || 'não definido'}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ASSET_ALLOWED_MIME_TYPES.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ''
          if (file) onPick(file)
        }}
      />
    </div>
  )
}
