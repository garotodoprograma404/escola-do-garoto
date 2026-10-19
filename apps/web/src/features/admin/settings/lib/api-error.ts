import type { ApiErrorBody } from '@vox/contracts'

/**
 * Texto de erro para mostrar ao usuário a partir da resposta da API.
 * Validação (400): a primeira mensagem de campo.
 * Os outros blocos de conteúdo (categorias, banners, blog) reutilizam este helper.
 */
export function apiErrorMessage(error: ApiErrorBody, fallback: string): string {
  if (error.statusCode === 400 && error.issues) {
    for (const messages of Object.values(error.issues)) {
      const first = messages?.[0]
      if (first) return first
    }
  }
  if (error.statusCode === 401) return 'Não autenticado'
  if (error.statusCode === 403) return 'Sem permissão para esta ação'
  if (error.statusCode === 0) return error.message
  return error.message || fallback
}
