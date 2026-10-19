/**
 * Dia `AAAA-MM-DD` (como a API manda) no formato `05 de mar.`. O texto é lido como data LOCAL ao
 * meio-dia: `new Date('2026-03-05')` seria meia-noite UTC e, no Brasil, mostraria o dia anterior.
 */
export function formatDayLabel(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}
