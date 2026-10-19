import type { ApiErrorBody } from '@vox/contracts'

/**
 * Mensagem para mostrar na tela quando a API recusa algo. Se a validação apontou um campo,
 * mostra a primeira mensagem dele.
 */
export function apiErrorMessage(error: ApiErrorBody, fallback: string): string {
  if (error.issues) {
    for (const messages of Object.values(error.issues)) {
      if (messages?.[0]) return messages[0]
    }
  }
  return error.message || fallback
}

/** Id de curso vindo da tela (texto) → número seguro para montar o caminho da API; `null` se inválido. */
export function parseCourseId(courseId: string | number): number | null {
  const text = String(courseId).trim()
  if (!/^\d{1,15}$/.test(text)) return null
  const value = Number.parseInt(text, 10)
  return value > 0 ? value : null
}
