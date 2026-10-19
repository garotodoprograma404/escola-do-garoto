/** Data e hora no padrão brasileiro (ex.: `05/03/2026, 12:30`). Sem valor: "Não informado". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Não informado'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

/** Texto sem espaços nas pontas; `null`/`undefined` viram vazio (para comparar rascunho com o salvo). */
export function normalizeNullableText(value: string | null | undefined): string {
  return (value || '').trim()
}
