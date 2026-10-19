'use server'

import { revalidatePath } from 'next/cache'
import { apiServer } from '@/lib/server-api'
import {
  createCertificateTemplateSchema,
  mutateTemplateStatusSchema,
  type CreateCertificateTemplateInput,
  type MutateTemplateStatusInput,
  updateCertificateTemplateSchema,
  type UpdateCertificateTemplateInput,
} from '../lib/certificateTemplateValidations'
import { apiErrorMessage } from '../lib/apiError'

interface ActionError {
  success: false
  error: string
}

interface ActionSuccess {
  success: true
}

type ActionResult = ActionError | ActionSuccess

function toActionError(error: unknown, fallback: string): ActionError {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  }
}

// A autorização (papel admin) é conferida pela API em todas as rotas; aqui só chamamos.

export async function createCertificateTemplateAction(
  input: CreateCertificateTemplateInput,
): Promise<ActionResult> {
  try {
    const parsed = createCertificateTemplateSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Dados inválidos para criar template',
      }
    }

    const result = await apiServer('/certificates/templates', { method: 'POST', body: parsed.data })

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível criar o template agora'),
      }
    }

    revalidatePath('/admin/certificates')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in createCertificateTemplateAction:', error)
    return toActionError(error, 'Erro ao criar template')
  }
}

export async function updateCertificateTemplateAction(
  input: UpdateCertificateTemplateInput,
): Promise<ActionResult> {
  try {
    const parsed = updateCertificateTemplateSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Dados inválidos para atualizar template',
      }
    }

    const { templateId, ...body } = parsed.data
    const result = await apiServer(`/certificates/templates/${templateId}`, {
      method: 'PATCH',
      body,
    })

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível atualizar o template agora'),
      }
    }

    revalidatePath('/admin/certificates')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in updateCertificateTemplateAction:', error)
    return toActionError(error, 'Erro ao atualizar template')
  }
}

export async function publishCertificateTemplateAction(
  input: MutateTemplateStatusInput,
): Promise<ActionResult> {
  try {
    const parsed = mutateTemplateStatusSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Template inválido',
      }
    }

    const result = await apiServer(`/certificates/templates/${parsed.data.templateId}/publish`, {
      method: 'POST',
    })

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível publicar o template agora'),
      }
    }

    revalidatePath('/admin/certificates')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in publishCertificateTemplateAction:', error)
    return toActionError(error, 'Erro ao publicar template')
  }
}

export async function unpublishCertificateTemplateAction(
  input: MutateTemplateStatusInput,
): Promise<ActionResult> {
  try {
    const parsed = mutateTemplateStatusSchema.safeParse(input)

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Template inválido',
      }
    }

    const result = await apiServer(`/certificates/templates/${parsed.data.templateId}/unpublish`, {
      method: 'POST',
    })

    if (!result.ok) {
      return {
        success: false,
        error: apiErrorMessage(result.error, 'Não foi possível despublicar o template agora'),
      }
    }

    revalidatePath('/admin/certificates')

    return { success: true }
  } catch (error: unknown) {
    console.error('Error in unpublishCertificateTemplateAction:', error)
    return toActionError(error, 'Erro ao despublicar template')
  }
}
