'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'

interface ToggleStatusResult {
  success: boolean
  error?: string
  warning?: string
  data?: {
    id: string
    isActive: boolean
  }
}

export async function toggleStatusAction(categoryId: string): Promise<ToggleStatusResult> {
  const result = await apiServer<{ id: number; is_active: boolean }>(
    `/admin/categories/${encodeURIComponent(categoryId)}/toggle-status`,
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
      isActive: result.data.is_active,
    },
  }
}
