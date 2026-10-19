// Upload Utilities (os arquivos vão para a API NestJS: POST /api/files/upload)

export type UploadType =
  'avatar' | 'thumbnail' | 'document' | 'banner-desktop' | 'banner-mobile' | 'blog_featured'

interface UploadConfig {
  bucket: string
  maxSize: number
  allowedTypes: string[]
  recommendedDimensions?: string
}

const uploadConfigs: Record<UploadType, UploadConfig> = {
  avatar: {
    bucket: 'public',
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  thumbnail: {
    bucket: 'thumbnails',
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  document: {
    bucket: 'documents',
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  'banner-desktop': {
    bucket: 'public',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    recommendedDimensions: '1920x600px',
  },
  'banner-mobile': {
    bucket: 'public',
    maxSize: 3 * 1024 * 1024, // 3MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    recommendedDimensions: '768x400px',
  },
  blog_featured: {
    bucket: 'public',
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    recommendedDimensions: '1200x630px (Open Graph padrão)',
  },
}

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export function validateFile(file: File, type: UploadType): { valid: boolean; error?: string } {
  const config = uploadConfigs[type]

  if (!config.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${config.allowedTypes.join(', ')}`,
    }
  }

  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024)
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    }
  }

  return { valid: true }
}

/**
 * Envia o arquivo para a API. O nome final é gerado pelo servidor; o `userId` fica só por
 * compatibilidade com quem já chama (a API usa o usuário da sessão, nunca o que o cliente manda).
 */
export async function uploadFile(
  file: File,
  type: UploadType,
  _userId?: string,
): Promise<UploadResult> {
  const validation = validateFile(file, type)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const body = new FormData()
    body.append('file', file)

    const response = await fetch(`/api/files/upload?type=${encodeURIComponent(type)}`, {
      method: 'POST',
      body,
      credentials: 'same-origin',
    })
    const payload = (await response.json().catch(() => undefined)) as
      { url?: string; path?: string; message?: string } | undefined

    if (!response.ok || !payload?.url) {
      return { success: false, error: payload?.message ?? 'Erro ao fazer upload do arquivo' }
    }

    return { success: true, url: payload.url, path: payload.path }
  } catch (error) {
    console.error('Upload error:', error)
    return { success: false, error: 'Erro ao fazer upload do arquivo' }
  }
}

export async function deleteFile(
  path: string,
  type: UploadType,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/files/${uploadConfigs[type].bucket}/${path}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    })
    if (!response.ok) {
      return { success: false, error: 'Erro ao deletar arquivo' }
    }
    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Erro ao deletar arquivo' }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
}

export function isVideoFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)
}

export function isDocumentFile(filename: string): boolean {
  const ext = getFileExtension(filename)
  return ['pdf', 'zip', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)
}
