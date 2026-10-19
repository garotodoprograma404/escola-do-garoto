'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import {
  createShowcase,
  updateShowcase,
  deleteShowcase,
  moveShowcase,
} from '../services/contentService'

/** Mensagem da API quando houver; senão a padrão. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

const showcaseSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(['manual', 'dynamic']),
  courseIds: z.array(z.string()).optional(),
  dynamicRule: z.enum(['bestsellers', 'newest', 'highest_rated']).optional(),
  limit: z.number().min(1).max(20).optional(),
  active: z.boolean(),
})

export async function createShowcaseAction(data: unknown) {
  try {
    const validated = showcaseSchema.parse(data)

    const showcase = await createShowcase(validated)

    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')

    return { success: true, data: showcase }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Dados inválidos', details: error.errors }
    }
    return { success: false, error: errorMessage(error, 'Erro ao criar vitrine') }
  }
}

export async function updateShowcaseAction(id: string, data: unknown) {
  try {
    const validated = showcaseSchema.parse(data)

    const showcase = await updateShowcase(id, validated)

    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')

    return { success: true, data: showcase }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Dados inválidos', details: error.errors }
    }
    return { success: false, error: errorMessage(error, 'Erro ao atualizar vitrine') }
  }
}

export async function deleteShowcaseAction(id: string) {
  try {
    await deleteShowcase(id)
    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')
    return { success: true }
  } catch (err) {
    console.error('Error deleting showcase:', err)
    return { success: false, error: errorMessage(err, 'Erro ao excluir vitrine') }
  }
}

export async function moveShowcaseAction(id: string, direction: 'up' | 'down') {
  try {
    await moveShowcase(id, direction)
    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')
    return { success: true }
  } catch (err) {
    console.error('Error moving showcase:', err)
    return { success: false, error: errorMessage(err, 'Erro ao mover vitrine') }
  }
}
