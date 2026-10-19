import { z } from 'zod'

// Schema para criar/editar post
export const blogPostSchema = z.object({
  title: z
    .string()
    .min(5, 'Título deve ter no mínimo 5 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(200, 'Slug deve ter no máximo 200 caracteres')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug deve conter apenas letras minúsculas, números e hífens',
    ),
  excerpt: z
    .string()
    .max(300, 'Resumo deve ter no máximo 300 caracteres')
    .optional()
    .or(z.literal('')),
  content: z.string().min(50, 'Conteúdo deve ter no mínimo 50 caracteres'),
  category: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  featuredImageUrl: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  isFeatured: z.boolean().default(false),
  seoTitle: z
    .string()
    .max(60, 'Meta título deve ter no máximo 60 caracteres')
    .optional()
    .or(z.literal('')),
  seoDescription: z
    .string()
    .max(160, 'Meta descrição deve ter no máximo 160 caracteres')
    .optional()
    .or(z.literal('')),
  seoKeywords: z.array(z.string()).optional().default([]),
})

export type BlogPostFormData = z.infer<typeof blogPostSchema>

// Helper para gerar slug a partir do título
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, '') // Remove hífens do início e fim
}

// Helper para calcular tempo de leitura (palavras / 200)
