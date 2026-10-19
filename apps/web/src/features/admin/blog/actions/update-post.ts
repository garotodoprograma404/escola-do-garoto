'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'
import { blogPostSchema, type BlogPostFormData } from '../lib/validations'

export async function updatePostAction(postId: string, data: BlogPostFormData) {
  const parsed = blogPostSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const result = await apiServer<Record<string, unknown>>(
    `/admin/blog/posts/${encodeURIComponent(postId)}`,
    { method: 'PUT', body: parsed.data },
  )

  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao atualizar post') }
  }

  // Revalidar cache
  revalidatePath('/admin/blog')

  return { success: true, data: result.data }
}
