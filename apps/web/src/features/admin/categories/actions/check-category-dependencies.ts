'use server'

import { apiServer } from '@/lib/server-api'

interface CategoryDependencies {
  canDelete: boolean
  hasChildren: boolean
  childrenCount: number
  coursesCount: number
  reasons: string[]
}

interface CheckDependenciesResult {
  success: boolean
  error?: string
  data?: CategoryDependencies
}

export async function checkCategoryDependenciesAction(
  categoryId: string,
): Promise<CheckDependenciesResult> {
  const result = await apiServer<{ children_count: number; courses_count: number }>(
    `/admin/categories/${encodeURIComponent(categoryId)}/dependencies`,
  )

  if (!result.ok) {
    return {
      success: false,
      error:
        result.error.statusCode === 404
          ? 'Categoria não encontrada'
          : 'Erro ao verificar dependências da categoria',
    }
  }

  const childrenCount = result.data.children_count || 0
  const coursesCount = result.data.courses_count || 0
  const hasChildren = childrenCount > 0
  const hasCourses = coursesCount > 0
  const canDelete = !hasChildren && !hasCourses

  const reasons: string[] = []

  if (hasChildren) {
    reasons.push(
      `Esta categoria possui ${childrenCount} subcategoria(s). Remova ou mova as subcategorias antes de excluir.`,
    )
  }

  if (hasCourses) {
    reasons.push(
      `Existem ${coursesCount} curso(s) vinculado(s) a esta categoria. Mova os cursos para outra categoria antes de excluir.`,
    )
  }

  if (!canDelete) {
    reasons.push(
      'Sugestão: Considere desativar a categoria ao invés de excluí-la para manter o histórico.',
    )
  }

  return {
    success: true,
    data: { canDelete, hasChildren, childrenCount, coursesCount, reasons },
  }
}
