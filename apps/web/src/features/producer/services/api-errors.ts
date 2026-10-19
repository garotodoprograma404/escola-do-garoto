import type { ApiErrorBody } from '@vox/contracts'

/**
 * Mensagem para mostrar ao usuário a partir de um erro da API: o primeiro erro de campo
 * (validação) ou, na falta, a mensagem geral.
 */
export function apiErrorMessage(
  error: ApiErrorBody,
  fallback = 'Algo deu errado. Tente de novo.',
): string {
  const firstIssue = error.issues ? Object.values(error.issues).flat().find(Boolean) : undefined
  return firstIssue || error.message || fallback
}
