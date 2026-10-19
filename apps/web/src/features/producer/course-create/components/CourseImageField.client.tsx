'use client'

import { useRef, useState, type DragEvent } from 'react'
import { ImageIcon } from 'lucide-react'
import { Label } from '@/shared/components/ui/label'
import { useToast } from '@/shared/hooks/use-toast'
import { uploadFile } from '@/shared/lib/upload'
import { cn } from '@/shared/lib/utils'

interface CourseImageFieldProps {
  label: string
  /** Medidas e formatos recomendados, abaixo do rótulo. */
  hint: string
  /** Texto pequeno dentro da área vazia (ex.: "PNG, JPG, WebP até 2MB"). */
  dropHint: string
  alt: string
  value: string
  onChange: (url: string) => void
  error?: string
}

/** Imagem do curso (thumbnail ou capa): clicar ou arrastar, prévia imediata e envio para a API. */
export function CourseImageField({
  label,
  hint,
  dropHint,
  alt,
  value,
  onChange,
  error,
}: CourseImageFieldProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState(value)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return

    const savedUrl = previewUrl
    // A prévia local só vale enquanto o envio não terminou (senão sobrescreveria o resultado).
    let settled = false
    const reader = new FileReader()
    reader.onloadend = () => {
      if (!settled) setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    const result = await uploadFile(file, 'thumbnail')
    settled = true

    if (result.success && result.url) {
      setPreviewUrl(result.url)
      onChange(result.url)
      return
    }

    // Não gravou: volta para a imagem anterior em vez de mostrar uma que não foi salva.
    setPreviewUrl(savedUrl)
    toast({
      title: 'Não foi possível enviar a imagem',
      description: result.error,
      variant: 'destructive',
    })
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  return (
    <div>
      <Label>
        {label} <span className="text-slate-600 dark:text-slate-400">(opcional)</span>
      </Label>
      <p className="mb-3 mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</p>

      {previewUrl ? (
        <div className="group relative aspect-video w-full overflow-hidden rounded-lg border-2 border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt={alt} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
            >
              Alterar
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewUrl('')
                onChange('')
              }}
              className="rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setIsDragging(false)
          }}
          onDrop={handleDrop}
          className={cn(
            'flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 transition-all hover:border-brand-500 hover:bg-brand-500/5 dark:border-slate-700',
            isDragging && 'border-brand-500 bg-brand-500/5',
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <ImageIcon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="px-4 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Clique ou arraste
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{dropHint}</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label={`Arquivo de imagem: ${label}`}
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}
