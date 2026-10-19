'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Camera, X } from 'lucide-react'
import { uploadFile, validateFile } from '../lib/upload'
import type { UploadType } from '../lib/upload'
import Image from 'next/image'

interface ImageUploadProps {
  type: UploadType
  currentImage?: string | null
  onUploadComplete: (url: string, path: string) => void
  onUploadError?: (error: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  shape?: 'square' | 'circle'
}

const sizeClasses = {
  sm: 'h-24 w-24',
  md: 'h-32 w-32',
  lg: 'h-48 w-48',
}

export function ImageUpload({
  type,
  currentImage,
  onUploadComplete,
  onUploadError,
  className = '',
  size = 'md',
  shape = 'square',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file
    const validation = validateFile(file, type)
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido')
      if (onUploadError) onUploadError(validation.error || 'Arquivo inválido')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setIsUploading(true)

    const result = await uploadFile(file, type)

    if (result.success && result.url && result.path) {
      onUploadComplete(result.url, result.path)
      setPreview(result.url)
    } else {
      setError(result.error || 'Erro ao fazer upload')
      if (onUploadError) onUploadError(result.error || 'Erro ao fazer upload')
      setPreview(currentImage || null)
    }

    setIsUploading(false)
  }

  function handleRemove() {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <div
          className={`${sizeClasses[size]} ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'} relative flex items-center justify-center overflow-hidden bg-muted`}
        >
          {preview ? (
            <Image src={preview} alt="Preview" fill className="object-cover" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
        </div>

        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Selecionar imagem"
          className={`absolute bottom-0 right-0 ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Camera className="h-4 w-4" />
        </Button>

        {preview && !isUploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            aria-label="Remover imagem"
            className={`absolute right-0 top-0 ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          aria-label="Arquivo de imagem"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>

      {isUploading && <p className="text-sm text-muted-foreground">Fazendo upload...</p>}

      {error && <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">{error}</div>}
    </div>
  )
}
