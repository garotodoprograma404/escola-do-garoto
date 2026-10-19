interface CheckoutAccountFinalizationInput {
  metadata: unknown
  status: unknown
  hasAuthenticatedUser: boolean
}

export interface CheckoutAccountFinalizationState {
  isApproved: boolean
  checkoutIdentityMode: string
  hasPendingAccountMarker: boolean
  passwordAlreadyDefined: boolean
  isNewAccountAfterPayment: boolean
  shouldFinalizeAccount: boolean
}

export function asCheckoutMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

export function getCheckoutAccountFinalizationState({
  metadata,
  status,
  hasAuthenticatedUser,
}: CheckoutAccountFinalizationInput): CheckoutAccountFinalizationState {
  const orderMetadata = asCheckoutMetadata(metadata)
  const orderStatus = String(status || '')
    .trim()
    .toLowerCase()
  const checkoutIdentityMode = String(orderMetadata.checkout_identity_mode || '')
    .trim()
    .toLowerCase()
  const pendingAccount = orderMetadata.pending_account
  const hasPendingAccountMarker =
    checkoutIdentityMode === 'pending_account' ||
    Boolean(pendingAccount && typeof pendingAccount === 'object' && !Array.isArray(pendingAccount))
  const passwordAlreadyDefined =
    String(orderMetadata.account_password_defined_at || '').trim().length > 0
  const isApproved = orderStatus === 'approved' || orderStatus === 'free_completed'
  const isNewAccountAfterPayment =
    orderMetadata.account_created_after_payment === true || hasPendingAccountMarker

  return {
    isApproved,
    checkoutIdentityMode,
    hasPendingAccountMarker,
    passwordAlreadyDefined,
    isNewAccountAfterPayment,
    shouldFinalizeAccount:
      !hasAuthenticatedUser && isApproved && isNewAccountAfterPayment && !passwordAlreadyDefined,
  }
}
