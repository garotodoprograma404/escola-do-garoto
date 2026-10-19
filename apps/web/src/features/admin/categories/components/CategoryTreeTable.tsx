'use client'

import { Fragment } from 'react'
import {
  Edit,
  Trash2,
  MoreVertical,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import type { Category } from '../types'

interface CategoryTreeTableProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
  onToggleFeatured: (id: string) => void
  onToggleStatus?: (id: string) => void
  onReorder?: (id: string, direction: 'up' | 'down') => void
}

export function CategoryTreeTable({
  categories,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleStatus,
  onReorder,
}: CategoryTreeTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  // Helper para obter o ícone de forma consistente (suporta emojis multi-byte)
  const getCategoryIcon = (category: Category): string => {
    if (category.icon && typeof category.icon === 'string' && category.icon.length > 0) {
      // Usar Array.from para lidar corretamente com emojis (multi-byte)
      return Array.from(category.icon)[0].toUpperCase()
    }
    if (category.name && typeof category.name === 'string' && category.name.length > 0) {
      return Array.from(category.name)[0].toUpperCase()
    }
    return '?'
  }

  // Organize categories in tree structure
  const rootCategories = categories.filter((c) => !c.parentId)
  const getChildren = (parentId: string) => categories.filter((c) => c.parentId === parentId)

  const renderCategory = (category: Category, level: number = 0): React.ReactNode => {
    const children = getChildren(category.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(category.id)

    // Verificar se é primeiro ou último no seu nível
    const siblings = categories.filter((c) => c.parentId === category.parentId)
    const sortedSiblings = siblings.sort((a, b) => a.order - b.order)
    const currentIndex = sortedSiblings.findIndex((c) => c.id === category.id)
    const isFirst = currentIndex === 0
    const isLast = currentIndex === sortedSiblings.length - 1

    return (
      <Fragment key={category.id}>
        <TableRow className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
          {/* Name with hierarchy */}
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {!hasChildren && <div className="w-6" />}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                    {getCategoryIcon(category)}
                  </span>
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{category.name}</span>
                {category.isFeatured && (
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                )}
              </div>
            </div>
          </TableCell>

          {/* Slug */}
          <TableCell>
            <code className="rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
              {category.slug}
            </code>
          </TableCell>

          {/* Status */}
          <TableCell>
            <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
              {category.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          </TableCell>

          {/* Course Count */}
          <TableCell className="text-center">
            <span className="text-slate-600 dark:text-slate-400">{category.courseCount}</span>
          </TableCell>

          {/* Order */}
          <TableCell className="text-center">
            {onReorder && (
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onReorder(category.id, 'up')}
                  disabled={isFirst}
                  title="Mover para cima"
                >
                  <ChevronUp size={14} />
                </Button>
                <span className="min-w-[20px] text-center text-xs text-slate-600 dark:text-slate-400">
                  {category.order}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onReorder(category.id, 'down')}
                  disabled={isLast}
                  title="Mover para baixo"
                >
                  <ChevronDown size={14} />
                </Button>
              </div>
            )}
            {!onReorder && (
              <span className="text-slate-600 dark:text-slate-400">{category.order}</span>
            )}
          </TableCell>

          {/* Actions */}
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ações da categoria ${category.name}`}
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(category)}>
                  <Edit size={16} className="mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleFeatured(category.id)}>
                  <Star size={16} className="mr-2" />
                  {category.isFeatured ? 'Remover Destaque' : 'Destacar'}
                </DropdownMenuItem>
                {onToggleStatus && (
                  <DropdownMenuItem onClick={() => onToggleStatus(category.id)}>
                    {category.status === 'active' ? (
                      <>
                        <span className="mr-2">🔴</span>
                        Desativar
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🟢</span>
                        Ativar
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(category.id)} className="text-red-600">
                  <Trash2 size={16} className="mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && children.map((child) => renderCategory(child, level + 1))}
      </Fragment>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-400">
          Nenhuma categoria encontrada. Crie a primeira categoria.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-950">
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Cursos</TableHead>
              <TableHead className="text-center">Ordem</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rootCategories.map((category) => renderCategory(category))}</TableBody>
        </Table>
      </div>
    </div>
  )
}
