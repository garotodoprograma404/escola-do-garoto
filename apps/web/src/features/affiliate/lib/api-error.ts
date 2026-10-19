import type { ApiErrorBody } from '@vox/contracts'

/**
 * Texto de erro da API para mostrar na tela. Quando a validação falha ("Dados inválidos"), usa a
 * primeira mensagem de campo (ex.: "Caminho de destino inválido") em vez do texto genérico.
 */
export function getApiErrorMessage(error: ApiErrorBody, fallback?: string): string {
  const firstIssue = Object.values(error.issues ?? {})
    .flat()
    .find((message): message is string => typeof message === 'string' && message.length > 0)
  return firstIssue ?? error.message ?? fallback ?? 'Algo deu errado. Tente de novo.'
}
