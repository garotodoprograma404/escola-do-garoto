/** Formato de erro devolvido pela API (ver ZodValidationPipe e filtros de exceção). */
export type ApiErrorBody = {
  statusCode: number
  message: string
  /** Código estável para o front reagir (ex.: `email_not_verified`). Opcional. */
  code?: string
  /** Erros por campo, quando a validação falha. */
  issues?: Record<string, string[] | undefined>
}
