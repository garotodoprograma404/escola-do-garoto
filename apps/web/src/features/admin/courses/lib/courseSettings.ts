import type { AdminCourseEditorSettings } from '../types'

export interface AdminIdentity {
  id: string
  name: string
  email: string
}

/** Configurações iniciais: curso do próprio admin, ou de um produtor quando já tem outro responsável. */
export function buildInitialSettings(
  adminIdentity: AdminIdentity,
  initialSettings?: Partial<AdminCourseEditorSettings>,
): AdminCourseEditorSettings {
  const initialProducerId = initialSettings?.producerId || adminIdentity.id
  const ownerMode = initialProducerId === adminIdentity.id ? 'self' : 'producer'

  return {
    ownerMode,
    producerId: ownerMode === 'producer' ? initialProducerId : adminIdentity.id,
    isFeatured: initialSettings?.isFeatured ?? false,
    couponsEnabled: initialSettings?.couponsEnabled ?? false,
    priceLockedByAdmin: initialSettings?.priceLockedByAdmin ?? false,
    adminNotes: initialSettings?.adminNotes ?? '',
  }
}

/** Formato enviado à API: sem produtor quando o responsável é o próprio admin; notas vazias viram `null`. */
export function toSettingsPayload(settings: AdminCourseEditorSettings) {
  return {
    ownerMode: settings.ownerMode,
    producerId: settings.ownerMode === 'producer' ? settings.producerId : null,
    isFeatured: settings.isFeatured,
    couponsEnabled: settings.couponsEnabled,
    priceLockedByAdmin: settings.priceLockedByAdmin,
    adminNotes: settings.adminNotes?.trim() || null,
  }
}
