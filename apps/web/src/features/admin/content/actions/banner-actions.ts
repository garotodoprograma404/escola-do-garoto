'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { createBanner, updateBanner, deleteBanner, moveBanner } from '../services/contentService'

// O limite de banners ativos (5) e o papel de admin são aplicados pela API.

/** Mensagem da API (ex.: limite de banners ativos) quando houver; senão a padrão. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

const bannerSchema = z
  .object({
    title: z.string().min(3),
    subtitle: z.string().min(3),
    desktopImageUrl: z.string().min(1, 'Imagem desktop é obrigatória'),
    mobileImageUrl: z.string().optional().or(z.literal('')),
    ctaText: z.string().min(2),
    ctaLink: z
      .string()
      .min(1)
      .refine(
        (value) => /^\/(?!\/)\S*$/.test(value) || /^https?:\/\/\S+$/.test(value),
        'Use um caminho do site (/catalog) ou um endereço http(s)',
      ),
    backgroundColor: z.string().optional(),
    textColor: z.enum(['white', 'black']).default('white'),
    startDate: z.string(),
    endDate: z.string().optional().or(z.literal('')),
    status: z.enum(['active', 'scheduled', 'expired', 'inactive']),
    position: z.enum(['hero', 'mid-page', 'popup']),
  })
  .refine(
    (data) => {
      // Validar que endDate > startDate
      if (data.endDate && data.endDate !== '') {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)
        return end > start
      }
      return true
    },
    {
      message: 'A data de fim deve ser posterior à data de início',
      path: ['endDate'],
    },
  )

export async function createBannerAction(data: unknown) {
  try {
    const validated = bannerSchema.parse(data)

    const banner = await createBanner({
      ...validated,
      startDate: new Date(validated.startDate).toISOString(),
      endDate: validated.endDate ? new Date(validated.endDate).toISOString() : null,
    })

    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')

    return { success: true, data: banner }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Dados inválidos', details: error.errors }
    }
    return { success: false, error: errorMessage(error, 'Erro ao criar banner') }
  }
}

export async function updateBannerAction(id: string, data: unknown) {
  try {
    const validated = bannerSchema.parse(data)

    const banner = await updateBanner(id, {
      ...validated,
      startDate: new Date(validated.startDate).toISOString(),
      endDate: validated.endDate ? new Date(validated.endDate).toISOString() : null,
    })

    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')

    return { success: true, data: banner }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Dados inválidos', details: error.errors }
    }
    return { success: false, error: errorMessage(error, 'Erro ao atualizar banner') }
  }
}

export async function deleteBannerAction(id: string) {
  try {
    await deleteBanner(id)
    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')
    return { success: true }
  } catch (err) {
    console.error('Error deleting banner:', err)
    return { success: false, error: errorMessage(err, 'Erro ao excluir banner') }
  }
}

export async function moveBannerAction(id: string, direction: 'up' | 'down') {
  try {
    await moveBanner(id, direction)
    revalidatePath('/admin/content')
    revalidatePath('/')
    revalidateTag('home-public', 'max')
    return { success: true }
  } catch (err) {
    console.error('Error moving banner:', err)
    return { success: false, error: errorMessage(err, 'Erro ao mover banner') }
  }
}
