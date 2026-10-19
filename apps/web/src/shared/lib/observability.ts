type EnvNumberOptions = {
  min?: number
  max?: number
}

function parseEnvNumber(
  value: string | undefined,
  fallback: number,
  options?: EnvNumberOptions,
): number {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback

  if (typeof options?.min === 'number' && parsed < options.min) {
    return options.min
  }

  if (typeof options?.max === 'number' && parsed > options.max) {
    return options.max
  }

  return parsed
}

const OBSERVABILITY_ENABLED = process.env.OBSERVABILITY_ENABLED !== 'false'
const API_FETCH_SLOW_MS = parseEnvNumber(process.env.API_FETCH_SLOW_MS, 1200, {
  min: 100,
  max: 60000,
})
const OBSERVABILITY_SLOW_CRITICAL_MULTIPLIER = parseEnvNumber(
  process.env.OBSERVABILITY_SLOW_CRITICAL_MULTIPLIER,
  2,
  { min: 2, max: 5 },
)

type OperationSlowRule = {
  pattern: RegExp
  thresholdMs: number
}

const OPERATION_SLOW_RULES: OperationSlowRule[] = [
  { pattern: /^route\.home\./, thresholdMs: 1200 },
  { pattern: /^route\.admin\.dashboard\./, thresholdMs: 1800 },
  { pattern: /^route\.producer\.dashboard\./, thresholdMs: 1600 },
  { pattern: /^route\.student\.dashboard\./, thresholdMs: 1600 },
  { pattern: /^route\.student\.courses\./, thresholdMs: 1500 },
  { pattern: /^route\.student\.player\./, thresholdMs: 1800 },
  { pattern: /^service\.student\.courses\./, thresholdMs: 1000 },
  { pattern: /^service\.student\.player\./, thresholdMs: 1000 },
  { pattern: /^proxy\./, thresholdMs: 900 },
  { pattern: /^api\./, thresholdMs: API_FETCH_SLOW_MS },
]

type ErrorWithCode = {
  code?: string
  message?: string
  digest?: string
  cause?: unknown
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'unknown error'
}

export function isTransientNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as ErrorWithCode
  const message = typeof typedError.message === 'string' ? typedError.message : ''
  if (
    typedError.code === 'ECONNRESET' ||
    message.includes('ECONNRESET') ||
    message.includes('TimeoutError') ||
    message.includes('upstream request timeout') ||
    message.includes('aborted due to timeout')
  ) {
    return true
  }

  if (!typedError.cause || typeof typedError.cause !== 'object') {
    return false
  }

  const cause = typedError.cause as ErrorWithCode
  const causeMessage = typeof cause.message === 'string' ? cause.message : ''
  return (
    cause.code === 'ECONNRESET' ||
    causeMessage.includes('ECONNRESET') ||
    causeMessage.includes('TimeoutError') ||
    causeMessage.includes('upstream request timeout') ||
    causeMessage.includes('aborted due to timeout')
  )
}

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  const typedError = error as ErrorWithCode
  if (typeof typedError.digest === 'string' && typedError.digest.includes('DYNAMIC_SERVER_USAGE')) {
    return true
  }

  return (
    typeof typedError.message === 'string' && typedError.message.includes('Dynamic server usage')
  )
}

export function logOperationalError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void {
  if (!OBSERVABILITY_ENABLED) return
  if (isDynamicServerUsageError(error)) return

  const payload = meta
    ? { ...meta, message: getErrorMessage(error) }
    : { message: getErrorMessage(error) }

  if (isTransientNetworkError(error)) {
    console.warn(`[obs][transient] ${context}`, payload)
    return
  }

  console.error(`[obs][error] ${context}`, payload)
}

function logSlowOperation(
  operation: string,
  durationMs: number,
  meta?: Record<string, unknown>,
): void {
  if (!OBSERVABILITY_ENABLED) return

  const thresholdMs = getSlowThreshold(operation)
  if (durationMs < thresholdMs) return

  const isCriticalBudgetBreach = durationMs >= thresholdMs * OBSERVABILITY_SLOW_CRITICAL_MULTIPLIER
  const logTag = isCriticalBudgetBreach ? '[obs][slow-critical]' : '[obs][slow]'
  const payloadBase = {
    durationMs,
    thresholdMs,
    budgetStatus: isCriticalBudgetBreach ? 'critical' : 'warning',
  }

  if (meta) {
    const payload = {
      ...payloadBase,
      ...meta,
    }
    if (isCriticalBudgetBreach) {
      console.error(`${logTag} ${operation}`, payload)
      return
    }
    console.warn(`${logTag} ${operation}`, payload)
    return
  }

  if (isCriticalBudgetBreach) {
    console.error(`${logTag} ${operation}`, payloadBase)
    return
  }

  console.warn(`${logTag} ${operation}`, payloadBase)
}

export async function measureOperation<T>(
  operation: string,
  executor: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> {
  const startedAt = Date.now()
  try {
    const result = await executor()
    logSlowOperation(operation, Date.now() - startedAt, meta)
    return result
  } catch (error) {
    logOperationalError(operation, error, {
      durationMs: Date.now() - startedAt,
      ...meta,
    })
    throw error
  }
}

function getSlowThreshold(operation: string): number {
  for (const rule of OPERATION_SLOW_RULES) {
    if (rule.pattern.test(operation)) {
      return rule.thresholdMs
    }
  }

  return API_FETCH_SLOW_MS
}
