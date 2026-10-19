/**
 * Sobe/desce `id` na lista ordenada de ids (troca com o vizinho). Devolve a nova ordem, ou
 * `'start'`/`'end'` se já estiver na ponta, ou `'missing'` se o id não estiver na lista.
 * A ordem nova é gravada como 0..n-1: funciona mesmo quando várias linhas tinham a mesma posição.
 */
export function moveInList(
  ids: readonly number[],
  id: number,
  direction: 'up' | 'down',
): number[] | 'start' | 'end' | 'missing' {
  const index = ids.indexOf(id)
  if (index === -1) return 'missing'
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0) return 'start'
  if (target >= ids.length) return 'end'
  const result = [...ids]
  ;[result[index], result[target]] = [result[target]!, result[index]!]
  return result
}
