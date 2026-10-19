'use client'

import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import {
  Upload,
  X,
  File,
  Image as ImageIcon,
  Video,
  FileText,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import {
  uploadFile,
  validateFile,
  formatFileSize,
  isImageFile,
  isVideoFile,
  isDocumentFile,
  deleteFile,
} from '../lib/upload'
import type { UploadType } from '../lib/upload'

interface FileUploadProps {
  type: UploadType
  onUploadComplete: (url: string, path: string) => void
  onUploadError?: (error: string) => void
  accept?: string
  maxSize?: number
  className?: string
  buttonText?: string
  showPreview?: boolean
  uploadedUrl?: string
  uploadedFileName?: string
  onClearUploaded?: () => void
}

interface UploadedFileState {
  url: string
  path: string
  name: string
  size: number
}

export function FileUpload({
  type,
  onUploadComplete,
  onUploadError,
  accept,
  className = '',
  buttonText = 'Selecionar Arquivo',
  showPreview = true,
  uploadedUrl,
  uploadedFileName,
  onClearUploaded,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemovingUploaded, setIsRemovingUploaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeUploadedUrl = uploadedFile?.url || uploadedUrl
  const activeUploadedName =
    uploadedFile?.name || uploadedFileName || getFileNameFromUrl(activeUploadedUrl)
  const activeUploadedSize = uploadedFile?.size

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError(null)

    // Validate file
    const validation = validateFile(selectedFile, type)
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido')
      if (onUploadError) onUploadError(validation.error || 'Arquivo inválido')
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (showPreview && isImageFile(selectedFile.name)) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  async function handleUpload() {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setProgress(0)

    // Simulate progress (real progress tracking would require chunked upload)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    const result = await uploadFile(file, type)

    clearInterval(progressInterval)
    setProgress(100)

    if (result.success && result.url && result.path) {
      setUploadedFile({
        url: result.url,
        path: result.path,
        name: file.name,
        size: file.size,
      })
      onUploadComplete(result.url, result.path)
      setFile(null)
      setPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } else {
      setError(result.error || 'Erro ao fazer upload')
      if (onUploadError) onUploadError(result.error || 'Erro ao fazer upload')
    }

    setIsUploading(false)
    setProgress(0)
  }

  async function handleClearUploaded() {
    setError(null)

    if (uploadedFile?.path) {
      setIsRemovingUploaded(true)

      const result = await deleteFile(uploadedFile.path, type)
      if (!result.success) {
        setError(result.error || 'Erro ao remover arquivo')
        if (onUploadError) onUploadError(result.error || 'Erro ao remover arquivo')
        setIsRemovingUploaded(false)
        return
      }
    }

    setUploadedFile(null)
    if (onClearUploaded) onClearUploaded()
    setIsRemovingUploaded(false)
  }

  function handleCancel() {
    setFile(null)
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function getFileIcon() {
    if (!file) return <Upload className="h-5 w-5" />

    if (isImageFile(file.name)) return <ImageIcon className="h-5 w-5" />
    if (isVideoFile(file.name)) return <Video className="h-5 w-5" />
    if (isDocumentFile(file.name)) return <FileText className="h-5 w-5" />

    return <File className="h-5 w-5" />
  }

  function getFileNameFromUrl(url?: string): string {
    if (!url) return 'Arquivo enviado'

    try {
      const parsedUrl = new URL(url)
      const lastSegment = parsedUrl.pathname.split('/').filter(Boolean).pop()
      if (!lastSegment) return 'Arquivo enviado'
      return decodeURIComponent(lastSegment)
    } catch {
      return 'Arquivo enviado'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>

        {file && !isUploading && (
          <>
            <Button type="button" onClick={handleUpload}>
              Fazer Upload
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {activeUploadedUrl && (
        <div className="overflow-hidden rounded-md border border-emerald-600/40 bg-emerald-500/10 p-3">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Arquivo enviado com sucesso</span>
              </div>
              <p className="break-all text-sm text-slate-700 dark:text-slate-300">
                {activeUploadedName}
              </p>
              {activeUploadedSize ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {formatFileSize(activeUploadedSize)}
                </p>
              ) : null}
              <a
                href={activeUploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs font-medium text-emerald-700 underline underline-offset-2 dark:text-emerald-300"
              >
                Visualizar arquivo
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={handleClearUploaded}
              disabled={isUploading || isRemovingUploaded}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {isRemovingUploaded ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </div>
      )}

      {file && (
        <div className="space-y-2">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-lg border p-3">
            {getFileIcon()}
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>

          {preview && (
            <div className="relative h-48 w-full overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-center text-sm text-muted-foreground">{progress}% concluído</p>
            </div>
          )}
        </div>
      )}

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    </div>
  )
}
