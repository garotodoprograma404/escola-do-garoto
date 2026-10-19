export const DEFAULT_PLATFORM_COMMISSION_RATE = 10

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PLATFORM_COMMISSION_RATE
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function normalizePlatformCommissionRate(raw: number | null | undefined): number {
  if (raw === null || raw === undefined) {
    return DEFAULT_PLATFORM_COMMISSION_RATE
  }

  const numericValue = Number(raw)
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_PLATFORM_COMMISSION_RATE
  }

  // Valores gravados como fração (0.10 = 10%) são convertidos para porcentagem.
  if (numericValue >= 0 && numericValue <= 1) {
    return roundToTwoDecimals(clampPercentage(numericValue * 100))
  }

  return roundToTwoDecimals(clampPercentage(numericValue))
}

export function normalizeProducerRateFromPlatformRate(platformRate: number): number {
  return roundToTwoDecimals(clampPercentage(100 - platformRate))
}

export function calculateProducerAndPlatformAmounts(
  grossAmount: number,
  platformCommissionRate: number,
): { producerAmount: number; platformAmount: number } {
  const safeGross = Math.max(0, Number(grossAmount) || 0)
  const safePlatformRate = clampPercentage(platformCommissionRate)
  const producerRate = normalizeProducerRateFromPlatformRate(safePlatformRate)

  const producerAmount = roundToTwoDecimals((safeGross * producerRate) / 100)
  const platformAmount = roundToTwoDecimals(safeGross - producerAmount)

  return {
    producerAmount,
    platformAmount,
  }
}

export function calculateAffiliateCommissionAmount(
  producerGrossAmount: number,
  affiliateCommissionRate: number,
): { affiliateAmount: number; producerNetAmount: number } {
  const safeProducerGrossAmount = Math.max(0, Number(producerGrossAmount) || 0)
  const safeAffiliateCommissionRate = clampPercentage(affiliateCommissionRate)
  const affiliateAmount = roundToTwoDecimals(
    (safeProducerGrossAmount * safeAffiliateCommissionRate) / 100,
  )
  const producerNetAmount = roundToTwoDecimals(
    Math.max(0, safeProducerGrossAmount - affiliateAmount),
  )

  return {
    affiliateAmount,
    producerNetAmount,
  }
}
