/** Valores que preenchem os campos dinâmicos (tokens) do modelo na hora de emitir. */
export interface CertificatePayload {
  student_name: string
  course_title: string
  issue_date: string
  certificate_code: string
  workload_hours: string
}

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

/** "13 de outubro de 2026" (fuso da plataforma, horário do Brasil). */
export function formatIssueDate(date: Date): string {
  return DATE_FORMAT.format(date)
}

/** Carga horária em horas cheias, no mínimo 1 ("120 horas"). */
export function toWorkloadText(totalDurationMinutes: number): string {
  const safeMinutes =
    Number.isFinite(totalDurationMinutes) && totalDurationMinutes > 0 ? totalDurationMinutes : 0
  const hours = Math.max(1, Math.round(safeMinutes / 60))
  return hours === 1 ? '1 hora' : `${hours} horas`
}

/** Dados de exemplo do preview do construtor. */
export function defaultPreviewPayload(now: Date = new Date()): CertificatePayload {
  return {
    student_name: 'Aluno Exemplo da Silva',
    course_title: 'Formação Completa de Exemplo',
    issue_date: formatIssueDate(now),
    certificate_code: 'GAROTO-2026-ABCD-1234-XY9Z',
    workload_hours: '120 horas',
  }
}
