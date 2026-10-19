import type { Role } from '@vox/contracts'

/** Os tipos de upload aceitos, com seus limites de tamanho e formatos. */
export const UPLOAD_TYPES = [
  'avatar',
  'thumbnail',
  'document',
  'banner-desktop',
  'banner-mobile',
  'blog_featured',
  'branding',
] as const
export type UploadType = (typeof UPLOAD_TYPES)[number]

export type Bucket = 'public' | 'thumbnails' | 'documents' | 'certificates'
/** Buckets que qualquer pessoa pode baixar pela URL pública. `documents` e `certificates` são privados. */
export const PUBLIC_BUCKETS: readonly Bucket[] = ['public', 'thumbnails']
export const ALL_BUCKETS: readonly Bucket[] = ['public', 'thumbnails', 'documents', 'certificates']

const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BANNER_IMAGES = ['image/jpeg', 'image/png', 'image/webp']
const MB = 1024 * 1024

type UploadRule = {
  bucket: Bucket
  folder: string
  maxBytes: number
  mimeTypes: readonly string[]
  /** Quem pode enviar. `null` = qualquer pessoa logada. */
  roles: readonly Role[] | null
}

export const UPLOAD_RULES: Record<UploadType, UploadRule> = {
  avatar: { bucket: 'public', folder: 'avatars', maxBytes: 2 * MB, mimeTypes: IMAGES, roles: null },
  thumbnail: {
    bucket: 'thumbnails',
    folder: 'thumbnails',
    maxBytes: 2 * MB,
    mimeTypes: IMAGES,
    roles: ['producer', 'admin'],
  },
  document: {
    bucket: 'documents',
    folder: 'general',
    maxBytes: 100 * MB,
    mimeTypes: [
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
    roles: ['producer', 'admin'],
  },
  'banner-desktop': {
    bucket: 'public',
    folder: 'banners',
    maxBytes: 5 * MB,
    mimeTypes: BANNER_IMAGES,
    roles: ['admin'],
  },
  'banner-mobile': {
    bucket: 'public',
    folder: 'banners',
    maxBytes: 3 * MB,
    mimeTypes: BANNER_IMAGES,
    roles: ['admin'],
  },
  blog_featured: {
    bucket: 'public',
    folder: 'blog-images',
    maxBytes: 5 * MB,
    mimeTypes: BANNER_IMAGES,
    roles: ['admin'],
  },
  // Logo e favicon da plataforma (configurações > marca). Só admin.
  branding: {
    bucket: 'public',
    folder: 'branding',
    maxBytes: 5 * MB,
    mimeTypes: [...BANNER_IMAGES, 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'],
    roles: ['admin'],
  },
}

/** Extensão segura a partir do tipo (nunca confiamos no nome que o cliente mandou). */
export const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'multipart/x-zip': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}
