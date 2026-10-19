'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { apiServer } from '@/lib/server-api'
import { certificateBuilderSchemaStrict } from '../lib/templateBuilderSchema'
import { apiErrorMessage } from '../lib/apiError'

const saveTemplateVersionSchema = z.object({
  templateId: z.coerce.number().int().positive('Template inválido'),
  schemaJson: certificateBuilderSchemaStrict,
  htmlSnapshot: z.string().trim().max(250_000, 'Snapshot HTML muito grande').optional().nullable(),
})

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function saveCertificateTemplateVersionAction(input: unknown) {
  try {
    const parsed = saveTemplateVersionSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Dados inválidos para salvar versão',
      }
    }

    const data = parsed.data

    // A API confere o papel admin e guarda a versão nova (as antigas nunca mudam).
    const result = await apiServer<{ versionNumber: number }>(
      `/certificates/templates/${data.templateId}/versions`,
      {
        method: 'POST',
        body: { schemaJson: data.schemaJson, htmlSnapshot: data.htmlSnapshot || null },
      },
    )

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível salvar a nova versão do template'),
      }
    }

    revalidatePath('/admin/certificates')
    revalidatePath(`/admin/certificates/${data.templateId}/builder`)
    revalidatePath(`/admin/certificates/${data.templateId}/builder/preview`)

    return {
      success: true,
      versionNumber: result.data.versionNumber,
    }
  } catch (error: unknown) {
    console.error('Error in saveCertificateTemplateVersionAction:', error)
    return {
      success: false,
      error: toErrorMessage(error, 'Erro ao salvar versão do template'),
    }
  }
}
