'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'

interface DeleteCategoryResult {
  success: boolean
  error?: string
  message?: string
}

export async function deleteCategoryAction(categoryId: string): Promise<DeleteCategoryResult> {
  // A API confere subcategorias e cursos vinculados dentro da mesma transação do delete.
  const result = await apiServer<{ name: string }>(
    `/admin/categories/${encodeURIComponent(categoryId)}`,
    { method: 'DELETE' },
  )

  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(
        result.error,
        'Erro ao excluir categoria. Por favor, tente novamente.',
      ),
    }
  }

  // Revalidar cache da página
  revalidatePath('/admin/categories')

  return {
    success: true,
    message: `Categoria "${result.data.name}" excluída com sucesso.`,
  }
}
