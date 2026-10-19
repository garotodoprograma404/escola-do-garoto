'use client'

import { useState, useRef } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Upload, X, Monitor, Smartphone } from 'lucide-react'
import { uploadFile, validateFile } from '@/shared/lib/upload'
import Image from 'next/image'

interface BannerImageUploadProps {
  desktopImage?: string | null
  mobileImage?: string | null
  onDesktopUpload: (url: string, path: string) => void
  onMobileUpload: (url: string, path: string) => void
  onError?: (error: string) => void
}

export function BannerImageUpload({
  desktopImage,
  mobileImage,
  onDesktopUpload,
  onMobileUpload,
  onError,
}: BannerImageUploadProps) {
  const [desktopPreview, setDesktopPreview] = useState<string | null>(desktopImage || null)
  const [mobilePreview, setMobilePreview] = useState<string | null>(mobileImage || null)
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false)
  const [isUploadingMobile, setIsUploadingMobile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  async function handleDesktopUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate
    const validation = validateFile(file, 'banner-desktop')
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido')
      if (onError) onError(validation.error || 'Arquivo inválido')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setDesktopPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setIsUploadingDesktop(true)
    const result = await uploadFile(file, 'banner-desktop')

    if (result.success && result.url && result.path) {
      onDesktopUpload(result.url, result.path)
      setDesktopPreview(result.url)
    } else {
      setError(result.error || 'Erro ao fazer upload')
      if (onError) onError(result.error || 'Erro ao fazer upload')
      setDesktopPreview(desktopImage || null)
    }

    setIsUploadingDesktop(false)
  }

  async function handleMobileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate
    const validation = validateFile(file, 'banner-mobile')
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido')
      if (onError) onError(validation.error || 'Arquivo inválido')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setMobilePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload
    setIsUploadingMobile(true)
    const result = await uploadFile(file, 'banner-mobile')

    if (result.success && result.url && result.path) {
      onMobileUpload(result.url, result.path)
      setMobilePreview(result.url)
    } else {
      setError(result.error || 'Erro ao fazer upload')
      if (onError) onError(result.error || 'Erro ao fazer upload')
      setMobilePreview(mobileImage || null)
    }

    setIsUploadingMobile(false)
  }

  function handleRemoveDesktop() {
    setDesktopPreview(null)
    if (desktopInputRef.current) {
      desktopInputRef.current.value = ''
    }
    onDesktopUpload('', '')
  }

  function handleRemoveMobile() {
    setMobilePreview(null)
    if (mobileInputRef.current) {
      mobileInputRef.current.value = ''
    }
    onMobileUpload('', '')
  }

  return (
    <div className="space-y-6">
      {/* Desktop Image */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-slate-600 dark:text-slate-400" />
          <Label className="text-sm font-medium">Imagem Desktop *</Label>
        </div>

        <div className="relative">
          <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            {desktopPreview ? (
              <Image
                src={desktopPreview}
                alt="Preview Desktop"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="p-4 text-center">
                <Upload className="mx-auto mb-2 h-8 w-8 text-slate-600 dark:text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clique para fazer upload
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Recomendado: 1920x600px (máx 5MB)
                </p>
              </div>
            )}
          </div>

          {!desktopPreview && (
            <Button
              type="button"
              variant="secondary"
              className="absolute inset-0 h-full w-full opacity-0 transition-opacity hover:opacity-100"
              onClick={() => desktopInputRef.current?.click()}
              disabled={isUploadingDesktop}
            >
              <Upload className="mr-2 h-5 w-5" />
              Selecionar Imagem Desktop
            </Button>
          )}

          {desktopPreview && !isUploadingDesktop && (
            <div className="absolute right-2 top-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => desktopInputRef.current?.click()}
              >
                <Upload className="mr-1 h-4 w-4" />
                Alterar
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={handleRemoveDesktop}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <input
            ref={desktopInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleDesktopUpload}
            disabled={isUploadingDesktop}
          />
        </div>

        {isUploadingDesktop && (
          <p className="text-sm text-blue-600 dark:text-blue-400">Fazendo upload...</p>
        )}
      </div>

      {/* Mobile Image */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-slate-600 dark:text-slate-400" />
          <Label className="text-sm font-medium">Imagem Mobile (Opcional)</Label>
        </div>

        <div className="relative">
          <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            {mobilePreview ? (
              <Image
                src={mobilePreview}
                alt="Preview Mobile"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="p-4 text-center">
                <Upload className="mx-auto mb-2 h-6 w-6 text-slate-600 dark:text-slate-400" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Clique para fazer upload
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Recomendado: 768x400px (máx 3MB)
                </p>
              </div>
            )}
          </div>

          {!mobilePreview && (
            <Button
              type="button"
              variant="secondary"
              className="absolute inset-0 h-full w-full opacity-0 transition-opacity hover:opacity-100"
              onClick={() => mobileInputRef.current?.click()}
              disabled={isUploadingMobile}
            >
              <Upload className="mr-2 h-5 w-5" />
              Selecionar Imagem Mobile
            </Button>
          )}

          {mobilePreview && !isUploadingMobile && (
            <div className="absolute right-2 top-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => mobileInputRef.current?.click()}
              >
                <Upload className="mr-1 h-4 w-4" />
                Alterar
              </Button>
              <Button type="button" size="sm" variant="destructive" onClick={handleRemoveMobile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <input
            ref={mobileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleMobileUpload}
            disabled={isUploadingMobile}
          />
        </div>

        {isUploadingMobile && (
          <p className="text-sm text-blue-600 dark:text-blue-400">Fazendo upload...</p>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Se não enviar imagem mobile, a imagem desktop será usada em todos os dispositivos
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
