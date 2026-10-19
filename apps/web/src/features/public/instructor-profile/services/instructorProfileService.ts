import { apiServer } from '@/lib/server-api'
import type { InstructorPublicProfile } from '../types'

/**
 * Perfil público do instrutor (ou `null`). A regra mora na API: só existe se o perfil está ativo,
 * com `public_profile_enabled` ligado e com ao menos um curso aprovado e publicado.
 */
export async function getPublicInstructorProfileBySlug(
  slug: string,
): Promise<InstructorPublicProfile | null> {
  const normalizedSlug = slug.trim()
  if (!normalizedSlug) return null

  const result = await apiServer<InstructorPublicProfile>(
    `/public/instructors/${encodeURIComponent(normalizedSlug)}`,
  )
  if (!result.ok) {
    if (result.error.statusCode !== 404 && result.error.statusCode !== 400) {
      console.error('Error fetching public instructor profile:', result.error.message)
    }
    return null
  }
  return result.data
}
