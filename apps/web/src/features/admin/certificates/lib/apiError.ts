import type { ApiErrorBody } from '@vox/contracts'

/**
 * Texto de erro da API para mostrar na tela: o primeiro erro de campo (validação) ou a mensagem.
 * Erro de servidor (5xx) vira o texto genérico `fallback`, sem expor detalhe interno.
 */
export function apiErrorMessage(error: ApiErrorBody, fallback: string): string {
  const firstIssue = Object.values(error.issues ?? {})
    .flat()
    .find((message): message is string => typeof message === 'string' && message.length > 0)
  if (firstIssue) return firstIssue
  if (error.statusCode >= 500) return fallback
  return error.message || fallback
}
