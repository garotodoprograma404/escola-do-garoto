'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'

interface ReorderCategoryResult {
  success: boolean
  error?: string
  data?: {
    movedId: string
    swappedId: string
  }
}

export async function reorderCategoryAction(
  categoryId: string,
  direction: 'up' | 'down',
): Promise<ReorderCategoryResult> {
  // A API troca a categoria com a vizinha do mesmo nível, dentro de uma transação.
  const result = await apiServer<{ moved_id: number; swapped_id: number }>(
    `/admin/categories/${encodeURIComponent(categoryId)}/move`,
    { body: { direction } },
  )

  if (!result.ok) {
    return { success: false, error: apiErrorMessage(result.error, 'Erro ao reordenar categoria') }
  }

  // Revalidar cache
  revalidatePath('/admin/categories')

  return {
    success: true,
    data: {
      movedId: String(result.data.moved_id),
      swappedId: String(result.data.swapped_id),
    },
  }
}
