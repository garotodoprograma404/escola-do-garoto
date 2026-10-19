/** Máximo de níveis da árvore de categorias (raiz = nível 1). */
const MAX_CATEGORY_LEVELS = 3

export type CategoryNode = { id: number; parentId: number | null }

/**
 * Valida colocar `categoryId` (ou uma categoria nova, `null`) debaixo de `parentId`.
 * Devolve a mensagem de erro, ou `null` se estiver tudo certo.
 */
export function validateParent(
  categoryId: number | null,
  parentId: number | null,
  all: readonly CategoryNode[],
): string | null {
  if (parentId === null) return null
  const byId = new Map(all.map((node) => [node.id, node]))
  if (!byId.has(parentId)) return 'Categoria pai não encontrada'

  if (categoryId !== null) {
    if (categoryId === parentId) return 'Uma categoria não pode ser pai dela mesma'

    // Sobe a partir do novo pai: se passar pela própria categoria, formaria um ciclo.
    const visited = new Set<number>()
    let current: number | null = parentId
    while (current !== null) {
      if (visited.has(current)) return 'Hierarquia circular detectada'
      if (current === categoryId) {
        return 'Não é possível tornar uma categoria filha de suas próprias subcategorias'
      }
      visited.add(current)
      current = byId.get(current)?.parentId ?? null
    }
  }

  // Quantos níveis já existem do pai até a raiz (o pai conta como 1).
  let levels = 0
  let current: number | null = parentId
  const seen = new Set<number>()
  while (current !== null && !seen.has(current)) {
    seen.add(current)
    levels++
    current = byId.get(current)?.parentId ?? null
  }
  if (levels >= MAX_CATEGORY_LEVELS) {
    return `Limite de ${MAX_CATEGORY_LEVELS} níveis de hierarquia atingido`
  }
  return null
}
