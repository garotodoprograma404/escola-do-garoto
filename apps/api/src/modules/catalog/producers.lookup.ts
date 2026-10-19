import { inArray } from 'drizzle-orm'
import type { Database } from '../../database/database.module.js'
import { profiles } from '../../database/schema/index.js'

export type ProducerSummary = {
  id: string
  fullName: string
  displayName: string | null
  avatarUrl: string | null
}

/**
 * Nome e avatar dos produtores de uma PÁGINA de cursos (consulta proporcional à página, não à
 * tabela). Só devolve o que a vitrine mostra: nada de CPF, telefone, endereço etc.
 */
export async function fetchProducers(
  db: Database,
  producerIds: string[],
): Promise<Map<string, ProducerSummary>> {
  const ids = [...new Set(producerIds)]
  if (ids.length === 0) return new Map()

  const rows = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(inArray(profiles.id, ids))

  return new Map(rows.map((row) => [row.id, row]))
}
