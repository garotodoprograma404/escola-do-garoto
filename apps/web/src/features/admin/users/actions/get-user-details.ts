'use server'

import { getUserDetailsById } from '../services/userService'

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export async function getUserDetailsAction(userId: string) {
  try {
    const normalizedUserId = String(userId || '').trim()

    if (!normalizedUserId) {
      return { success: false, error: 'Usuário inválido' }
    }

    const user = await getUserDetailsById(normalizedUserId)

    if (!user) {
      return { success: false, error: 'Usuário não encontrado' }
    }

    return { success: true, data: user }
  } catch (error: unknown) {
    console.error('Error in getUserDetailsAction:', error)
    return {
      success: false,
      error: getErrorMessage(error, 'Não foi possível carregar os detalhes do usuário'),
    }
  }
}
