// =====================================================
// MARK LESSON COMPLETE - SERVER ACTION
// =====================================================

'use server'

import { apiServer } from '@/lib/server-api'

/**
 * Marca a aula como concluída. A API confere a matrícula, se a aula é do curso e está publicada
 * (quiz exige aprovação), recalcula o progresso do curso e, no 100%, conclui a matrícula e aciona
 * a emissão do certificado. O percentual nunca vem do navegador.
 */
export async function markCompleteAction(
  lessonId: number,
): Promise<{ success: boolean; error?: string }> {
  const result = await apiServer(`/learning/lessons/${lessonId}/complete`, { method: 'POST' })
  if (result.ok) return { success: true }

  if (result.error.statusCode === 401) return { success: false, error: 'Não autenticado' }
  console.error('Error marking complete:', result.error.message)
  return { success: false, error: result.error.message || 'Erro ao marcar como concluída' }
}
