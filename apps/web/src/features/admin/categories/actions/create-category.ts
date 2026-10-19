'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import { apiErrorMessage } from '../../settings/lib/api-error'
import { categoryFormSchema } from '../lib/validations'
import type { CategoryFormInput } from '../lib/validations'

interface CreateCategoryResult {
  success: boolean
  error?: string
  data?: {
    id: string
    name: string
    slug: string
  }
}

export async function createCategoryAction(
  formData: CategoryFormInput,
): Promise<CreateCategoryResult> {
  // Validação do formulário (mensagens para o usuário); a API valida de novo e checa o papel.
  const parsed = categoryFormSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const result = await apiServer<{ id: number; name: string; slug: string }>('/admin/categories', {
    body: parsed.data,
  })

  if (!result.ok) {
    return {
      success: false,
      error: apiErrorMessage(result.error, 'Erro ao criar categoria. Por favor, tente novamente.'),
    }
  }

  // Revalidar cache da página
  revalidatePath('/admin/categories')

  return {
    success: true,
    data: {
      id: String(result.data.id),
      name: result.data.name,
      slug: result.data.slug,
    },
  }
}
