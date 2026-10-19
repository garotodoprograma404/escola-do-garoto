/**
 * Comissões em CENTAVOS. As taxas ficam no banco como percentual (`numeric(5,2)`: 10 = 10%) e
 * viram pontos-base (1000) só aqui dentro, para a conta ser inteira.
 */

const DEFAULT_PLATFORM_COMMISSION_RATE = 10

/**
 * Taxa da plataforma de um produtor, em PERCENTUAL (0..100). Sem taxa (ou inválida) vale o padrão.
 *
 * A taxa é sempre percentual (1 = 1%, 100 = 100%); frações não são aceitas, para `1` nunca virar
 * 100%.
 */
export function normalizeCommissionRate(raw: number | string | null | undefined): number {
  if (raw === null || raw === undefined || raw === '') return DEFAULT_PLATFORM_COMMISSION_RATE
  const rate = Number(raw)
  if (!Number.isFinite(rate)) return DEFAULT_PLATFORM_COMMISSION_RATE
  return Math.round(Math.min(100, Math.max(0, rate)) * 100) / 100
}

function rateToBps(ratePercent: number): number {
  return Math.round(normalizeCommissionRate(ratePercent) * 100)
}

/**
 * Divide o valor pago entre produtor e plataforma. O produtor é arredondado ao centavo e a
 * plataforma fica com o resto, então plataforma + produtor = pago.
 */
export function splitRevenue(grossCents: number, platformRatePercent: number) {
  const gross = Math.max(0, grossCents)
  const producerBps = 10_000 - rateToBps(platformRatePercent)
  const producerCents = Math.round((gross * producerBps) / 10_000)
  return { producerCents, platformCents: gross - producerCents }
}

/** Comissão do afiliado, que sai da parte BRUTA do produtor (o líquido do produtor é o resto). */
export function splitAffiliate(producerGrossCents: number, affiliateRatePercent: number) {
  const gross = Math.max(0, producerGrossCents)
  const rate = Number.isFinite(affiliateRatePercent) ? affiliateRatePercent : 0
  const bps = Math.round(Math.min(100, Math.max(0, rate)) * 100)
  const affiliateCents = Math.round((gross * bps) / 10_000)
  return { affiliateCents, producerNetCents: gross - affiliateCents }
}
