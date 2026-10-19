'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'

interface ToggleFeaturedResult {
  success: boolean
  error?: string
  data?: {
    id: string
    isFeatured: boolean
  }
}

export async function toggleFeaturedAction(categoryId: string): Promise<ToggleFeaturedResult> {
  const result = await apiServer<{ id: number; is_featured: boolean }>(
    `/admin/categories/${encodeURIComponent(categoryId)}/toggle-featured`,
    { method: 'POST' },
  )

  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao atualizar categoria') }
  }

  // Revalidar cache
  revalidatePath('/admin/categories')

  return {
    success: true,
    data: {
      id: categoryId,
      isFeatured: result.data.is_featured,
    },
  }
}
